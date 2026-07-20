const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const { createOAuth2Client } = require("../config/google");
const { writeDailyLog } = require("../services/log.service");

const {
  getStorageStatus,
  checkStorageAlerts,
} = require("../services/storage.service");

const {
  assertUserContentAccess,
  getFileMetadata,
} = require("../services/driveGuard.service");

const {
  uploadFile,
  listFiles,
  getFileDetails,
  downloadFile,
  renameFile,
  deleteFile,
  deleteTempFile,
} = require("../services/file.service");

const router = express.Router();

const FILE_LIST_CACHE_TTL_MS = 10 * 1000;
const fileListCache = new Map();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

const getFileListCacheKey = (user, parentFolderId) => {
  return `${user._id}:files:${parentFolderId || "root"}`;
};

const getCachedFileList = (user, parentFolderId) => {
  const cacheKey = getFileListCacheKey(user, parentFolderId);
  const cached = fileListCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    fileListCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
};

const setCachedFileList = (user, parentFolderId, payload) => {
  const cacheKey = getFileListCacheKey(user, parentFolderId);

  fileListCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + FILE_LIST_CACHE_TTL_MS,
  });
};

const clearUserFileListCache = (user) => {
  const userPrefix = `${user._id}:files:`;

  for (const key of fileListCache.keys()) {
    if (key.startsWith(userPrefix)) {
      fileListCache.delete(key);
    }
  }
};

const shouldForceRefresh = (req) => {
  return String(req.query.refresh || "").toLowerCase() === "true";
};

const formatBytesForMessage = (bytes) => {
  const value = Number(bytes || 0);

  if (value < 1024) return `${value} B`;

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getAvailableDriveBytes = (status) => {
  const limit = Number(status?.limit || 0);
  const usage = Number(status?.usage || 0);

  if (!limit || limit <= 0) {
    return null;
  }

  return Math.max(limit - usage, 0);
};

const hasEnoughDriveStorage = (status, fileSize) => {
  const availableBytes = getAvailableDriveBytes(status);

  if (availableBytes === null) {
    return true;
  }

  return Number(fileSize || 0) <= availableBytes;
};

const buildTooLargeResponse = (status, fileSize) => {
  const availableBytes = getAvailableDriveBytes(status);

  return {
    success: false,
    code: "INSUFFICIENT_DRIVE_STORAGE",
    message: `File is too large for available Google Drive storage. Available: ${formatBytesForMessage(
      availableBytes
    )}, file size: ${formatBytesForMessage(fileSize)}.`,
    fileSize,
    availableBytes,
    storageStatus: status,
  };
};

const checkDriveStorageBeforeUpload = async (req, res, next) => {
  try {
    const authClient = getUserAuthClient(req.user);

    const declaredFileSize = Number(
      req.headers["x-file-size"] || req.headers["content-length"] || 0
    );

    if (!declaredFileSize || declaredFileSize <= 0) {
      return next();
    }

    const status = await getStorageStatus(authClient);

    req.storageStatusBeforeUpload = status;

    if (!hasEnoughDriveStorage(status, declaredFileSize)) {
      return res
        .status(413)
        .json(buildTooLargeResponse(status, declaredFileSize));
    }

    return next();
  } catch (error) {
    console.error("Pre-upload storage check failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check available Google Drive storage before upload.",
      error: error.message,
    });
  }
};

const getFolderLocationInfo = async (authClient, user, parentFolderId) => {
  try {
    if (!parentFolderId || parentFolderId === user.driveFolders?.uploads) {
      return {
        parentFolderId: user.driveFolders?.uploads || null,
        parentFolderName: "Vault Root",
        locationType: "vault_root",
        uploadLocationType: "uploads_root",
      };
    }

    const parentMetadata = await getFileMetadata(authClient, parentFolderId);

    return {
      parentFolderId,
      parentFolderName: parentMetadata.name || "Unknown Folder",
      locationType: "folder",
      uploadLocationType: "folder",
    };
  } catch {
    return {
      parentFolderId: parentFolderId || null,
      parentFolderName: "Unknown Folder",
      locationType: "unknown",
      uploadLocationType: "folder",
    };
  }
};

const getFileLocationInfo = async (authClient, user, fileId) => {
  try {
    const metadata = await getFileMetadata(authClient, fileId);
    const parentFolderId = metadata.parents?.[0] || null;

    return await getFolderLocationInfo(authClient, user, parentFolderId);
  } catch {
    return {
      parentFolderId: null,
      parentFolderName: "Unknown Folder",
      locationType: "unknown",
      uploadLocationType: "folder",
    };
  }
};

const runStorageAlertCheck = async (authClient, user) => {
  try {
    const result = await checkStorageAlerts(
      authClient,
      user.driveFolders.system,
      {
        alertEmail: user.email,
      }
    );

    await writeDailyLog(authClient, user.driveFolders.logs, {
      action: "STORAGE_CHECK",
      status: "SUCCESS",
      userId: String(user._id),
      email: user.email,
      usage: result.status?.usage,
      limit: result.status?.limit,
      usageInDriveTrash: result.status?.usageInDriveTrash,
      usedPercent: result.status?.usedPercent,
    });

    if (result.alertsTriggered.length > 0) {
      await writeDailyLog(authClient, user.driveFolders.logs, {
        action: "STORAGE_ALERT_TRIGGERED",
        status: "SUCCESS",
        userId: String(user._id),
        email: user.email,
        alertsTriggered: result.alertsTriggered,
        emailResults: result.emailResults,
        usage: result.status?.usage,
        limit: result.status?.limit,
        usageInDriveTrash: result.status?.usageInDriveTrash,
        usedPercent: result.status?.usedPercent,
      });
    }

    return result;
  } catch (error) {
    console.error("Storage alert auto-check failed:", error.message);
    return null;
  }
};

router.post(
  "/upload",
  authMiddleware,
  checkDriveStorageBeforeUpload,
  upload.single("file"),
  async (req, res) => {
    try {
      const { parentFolderId } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File is required. Use form-data key: file",
        });
      }

      const authClient = getUserAuthClient(req.user);

      const finalParentFolderId =
        parentFolderId || req.user.driveFolders?.uploads;

      if (!finalParentFolderId) {
        return res.status(400).json({
          success: false,
          message: "Uploads folder not found. Please login again.",
        });
      }

      await assertUserContentAccess(authClient, req.user, finalParentFolderId);

      const exactFileSize = Number(req.file.size || 0);

      const storageStatus =
        req.storageStatusBeforeUpload || (await getStorageStatus(authClient));

      if (!hasEnoughDriveStorage(storageStatus, exactFileSize)) {
        await writeDailyLog(authClient, req.user.driveFolders.logs, {
          action: "FILE_UPLOAD_REJECTED",
          status: "FAILED",
          userId: String(req.user._id),
          email: req.user.email,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: exactFileSize,
          reason: "INSUFFICIENT_DRIVE_STORAGE",
          availableBytes: getAvailableDriveBytes(storageStatus),
        });

        return res
          .status(413)
          .json(buildTooLargeResponse(storageStatus, exactFileSize));
      }

      const uploadedFile = await uploadFile(authClient, {
        filePath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        parentFolderId: finalParentFolderId,
      });

      clearUserFileListCache(req.user);

      const locationInfo = await getFolderLocationInfo(
        authClient,
        req.user,
        finalParentFolderId
      );

      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "FILE_UPLOAD",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size || req.file.size,
        parentFolderId: locationInfo.parentFolderId,
        parentFolderName: locationInfo.parentFolderName,
        locationType: locationInfo.locationType,
        uploadLocationType: locationInfo.uploadLocationType,
      });

      const storageAlertResult = await runStorageAlertCheck(
        authClient,
        req.user
      );

      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        file: uploadedFile,
        storageStatus: storageAlertResult?.status || null,
        alertsTriggered: storageAlertResult?.alertsTriggered || [],
      });
    } catch (error) {
      console.error("Upload file error:", error);

      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to upload file",
      });
    } finally {
      await deleteTempFile(req.file?.path);
    }
  }
);

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { parentFolderId } = req.query;

    const authClient = getUserAuthClient(req.user);

    const finalParentFolderId =
      parentFolderId || req.user.driveFolders?.uploads;

    if (!finalParentFolderId) {
      return res.status(400).json({
        success: false,
        message: "Uploads folder not found. Please login again.",
      });
    }

    if (!shouldForceRefresh(req)) {
      const cachedPayload = getCachedFileList(req.user, finalParentFolderId);

      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }
    }

    await assertUserContentAccess(authClient, req.user, finalParentFolderId);

    const files = await listFiles(authClient, {
      parentFolderId: finalParentFolderId,
    });

    const payload = {
      success: true,
      count: files.length,
      files,
    };

    setCachedFileList(req.user, finalParentFolderId, payload);

    res.json({
      ...payload,
      cached: false,
    });
  } catch (error) {
    console.error("List files error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list files",
    });
  }
});

router.get("/:fileId/download", authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;

    const authClient = getUserAuthClient(req.user);

    await assertUserContentAccess(authClient, req.user, fileId);

    const locationInfo = await getFileLocationInfo(
      authClient,
      req.user,
      fileId
    );

    const { metadata, stream } = await downloadFile(authClient, {
      fileId,
    });

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FILE_DOWNLOAD",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      fileId: metadata.id,
      fileName: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      parentFolderId: locationInfo.parentFolderId,
      parentFolderName: locationInfo.parentFolderName,
      locationType: locationInfo.locationType,
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(metadata.name)}"`
    );

    res.setHeader(
      "Content-Type",
      metadata.mimeType || "application/octet-stream"
    );

    stream.pipe(res);
  } catch (error) {
    console.error("Download file error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to download file",
    });
  }
});

router.get("/:fileId", authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;

    const authClient = getUserAuthClient(req.user);

    await assertUserContentAccess(authClient, req.user, fileId);

    const file = await getFileDetails(authClient, {
      fileId,
    });

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error("Get file details error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to get file details",
    });
  }
});

router.patch("/:fileId", authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "New file name is required",
      });
    }

    const authClient = getUserAuthClient(req.user);

    await assertUserContentAccess(authClient, req.user, fileId);

    const beforeRenameMetadata = await getFileMetadata(authClient, fileId);

    const locationInfo = await getFolderLocationInfo(
      authClient,
      req.user,
      beforeRenameMetadata.parents?.[0]
    );

    const file = await renameFile(authClient, {
      fileId,
      name: name.trim(),
    });

    clearUserFileListCache(req.user);

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FILE_RENAME",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      fileId: file.id,
      oldFileName: beforeRenameMetadata.name,
      fileName: file.name,
      mimeType: file.mimeType || beforeRenameMetadata.mimeType,
      size: file.size || beforeRenameMetadata.size,
      parentFolderId: locationInfo.parentFolderId,
      parentFolderName: locationInfo.parentFolderName,
      locationType: locationInfo.locationType,
    });

    res.json({
      success: true,
      message: "File renamed successfully",
      file,
    });
  } catch (error) {
    console.error("Rename file error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to rename file",
    });
  }
});

router.delete("/:fileId", authMiddleware, async (req, res) => {
  try {
    const { fileId } = req.params;

    const authClient = getUserAuthClient(req.user);

    await assertUserContentAccess(authClient, req.user, fileId, {
      allowTrashed: true,
    });

    const beforeDeleteMetadata = await getFileMetadata(authClient, fileId);

    const locationInfo = await getFolderLocationInfo(
      authClient,
      req.user,
      beforeDeleteMetadata.parents?.[0]
    );

    const file = await deleteFile(authClient, {
      fileId,
    });

    clearUserFileListCache(req.user);

    if (!file.alreadyTrashed) {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "FILE_DELETE",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        fileId,
        fileName: file.name || beforeDeleteMetadata.name,
        mimeType: beforeDeleteMetadata.mimeType,
        size: beforeDeleteMetadata.size,
        parentFolderId: locationInfo.parentFolderId,
        parentFolderName: locationInfo.parentFolderName,
        locationType: locationInfo.locationType,
      });
    }

    const storageAlertResult = await runStorageAlertCheck(authClient, req.user);

    res.json({
      success: true,
      message: file.alreadyTrashed
        ? "File was already in trash"
        : "File moved to trash successfully",
      alreadyTrashed: file.alreadyTrashed,
      file,
      storageStatus: storageAlertResult?.status || null,
      alertsTriggered: storageAlertResult?.alertsTriggered || [],
    });
  } catch (error) {
    console.error("Delete file error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete file",
    });
  }
});

module.exports = router;