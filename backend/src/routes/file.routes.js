const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

const { createOAuth2Client } = require("../config/google");
const { writeDailyLog } = require("../services/log.service");
const { checkStorageAlerts } = require("../services/storage.service");
const { assertUserContentAccess } = require("../services/driveGuard.service");

const {
  uploadFile,
  listFiles,
  getFileDetails,
  downloadFile,
  renameFile,
  deleteFile,
} = require("../services/file.service");

const router = express.Router();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
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

    if (result.alertsTriggered.length > 0) {
      await writeDailyLog(authClient, user.driveFolders.logs, {
        action: "STORAGE_ALERT_TRIGGERED",
        status: "SUCCESS",
        userId: String(user._id),
        email: user.email,
        alertsTriggered: result.alertsTriggered,
        emailResults: result.emailResults,
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

      // ownership/access check before uploading into any folder
      await assertUserContentAccess(authClient, req.user, finalParentFolderId);

      const uploadedFile = await uploadFile(authClient, {
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        parentFolderId: finalParentFolderId,
      });

      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "FILE_UPLOAD",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size || req.file.size,
        parentFolderId: finalParentFolderId,
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

    // ownership/access check before listing folder contents
    await assertUserContentAccess(authClient, req.user, finalParentFolderId);

    const files = await listFiles(authClient, {
      parentFolderId: finalParentFolderId,
    });

    res.json({
      success: true,
      count: files.length,
      files,
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

    // ownership/access check before download
    await assertUserContentAccess(authClient, req.user, fileId);

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

    // ownership/access check before file details
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

    // ownership/access check before rename
    await assertUserContentAccess(authClient, req.user, fileId);

    const file = await renameFile(authClient, {
      fileId,
      name: name.trim(),
    });

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FILE_RENAME",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      size: file.size,
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

    // allowTrashed true because duplicate delete should return alreadyTrashed
    await assertUserContentAccess(authClient, req.user, fileId, {
      allowTrashed: true,
    });

    const file = await deleteFile(authClient, {
      fileId,
    });

    // avoid duplicate delete log
    if (!file.alreadyTrashed) {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "FILE_DELETE",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        fileId,
        fileName: file.name,
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