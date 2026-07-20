const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { createOAuth2Client } = require("../config/google");
const { writeDailyLog } = require("../services/log.service");

const {
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder,
} = require("../services/folder.service");

const {
  assertUserContentAccess,
  isProtectedVaultFolder,
  getFileMetadata,
} = require("../services/driveGuard.service");

const router = express.Router();

const FOLDER_LIST_CACHE_TTL_MS = 10 * 1000;
const folderListCache = new Map();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

const getFolderListCacheKey = (user, parentFolderId) => {
  return `${user._id}:folders:${parentFolderId || "root"}`;
};

const getCachedFolderList = (user, parentFolderId) => {
  const cacheKey = getFolderListCacheKey(user, parentFolderId);
  const cached = folderListCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    folderListCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
};

const setCachedFolderList = (user, parentFolderId, payload) => {
  const cacheKey = getFolderListCacheKey(user, parentFolderId);

  folderListCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + FOLDER_LIST_CACHE_TTL_MS,
  });
};

const clearUserFolderListCache = (user) => {
  const userPrefix = `${user._id}:folders:`;

  for (const key of folderListCache.keys()) {
    if (key.startsWith(userPrefix)) {
      folderListCache.delete(key);
    }
  }
};

const shouldForceRefresh = (req) => {
  return String(req.query.refresh || "").toLowerCase() === "true";
};

const getFolderLocationInfo = async (authClient, user, parentFolderId) => {
  try {
    if (!parentFolderId || parentFolderId === user.driveFolders?.uploads) {
      return {
        parentFolderId: user.driveFolders?.uploads || null,
        parentFolderName: "Vault Root",
        locationType: "vault_root",
      };
    }

    const parentMetadata = await getFileMetadata(authClient, parentFolderId);

    return {
      parentFolderId,
      parentFolderName: parentMetadata.name || "Unknown Folder",
      locationType: "folder",
    };
  } catch {
    return {
      parentFolderId: parentFolderId || null,
      parentFolderName: "Unknown Folder",
      locationType: "unknown",
    };
  }
};

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, parentFolderId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Folder name is required",
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

    const folder = await createFolder(authClient, {
      name: name.trim(),
      parentFolderId: finalParentFolderId,
    });

    clearUserFolderListCache(req.user);

    const locationInfo = await getFolderLocationInfo(
      authClient,
      req.user,
      finalParentFolderId
    );

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FOLDER_CREATE",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      folderId: folder.id,
      folderName: folder.name,
      parentFolderId: locationInfo.parentFolderId,
      parentFolderName: locationInfo.parentFolderName,
      locationType: locationInfo.locationType,
    });

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder,
    });
  } catch (error) {
    console.error("Create folder error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create folder",
    });
  }
});

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
      const cachedPayload = getCachedFolderList(req.user, finalParentFolderId);

      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }
    }

    await assertUserContentAccess(authClient, req.user, finalParentFolderId);

    const folders = await listFolders(authClient, {
      parentFolderId: finalParentFolderId,
    });

    const payload = {
      success: true,
      count: folders.length,
      folders,
    };

    setCachedFolderList(req.user, finalParentFolderId, payload);

    res.json({
      ...payload,
      cached: false,
    });
  } catch (error) {
    console.error("List folders error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to list folders",
    });
  }
});

router.patch("/:folderId", authMiddleware, async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "New folder name is required",
      });
    }

    if (isProtectedVaultFolder(req.user, folderId)) {
      return res.status(403).json({
        success: false,
        message: "Protected vault folders cannot be renamed.",
      });
    }

    const authClient = getUserAuthClient(req.user);

    await assertUserContentAccess(authClient, req.user, folderId);

    const beforeRenameMetadata = await getFileMetadata(authClient, folderId);

    const locationInfo = await getFolderLocationInfo(
      authClient,
      req.user,
      beforeRenameMetadata.parents?.[0]
    );

    const folder = await renameFolder(authClient, {
      folderId,
      name: name.trim(),
    });

    clearUserFolderListCache(req.user);

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FOLDER_RENAME",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      folderId: folder.id,
      oldFolderName: beforeRenameMetadata.name,
      folderName: folder.name,
      parentFolderId: locationInfo.parentFolderId,
      parentFolderName: locationInfo.parentFolderName,
      locationType: locationInfo.locationType,
    });

    res.json({
      success: true,
      message: "Folder renamed successfully",
      folder,
    });
  } catch (error) {
    console.error("Rename folder error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to rename folder",
    });
  }
});

router.delete("/:folderId", authMiddleware, async (req, res) => {
  try {
    const { folderId } = req.params;

    if (isProtectedVaultFolder(req.user, folderId)) {
      return res.status(403).json({
        success: false,
        message: "Protected vault folders cannot be deleted.",
      });
    }

    const authClient = getUserAuthClient(req.user);

    await assertUserContentAccess(authClient, req.user, folderId, {
      allowTrashed: true,
    });

    const beforeDeleteMetadata = await getFileMetadata(authClient, folderId);

    const locationInfo = await getFolderLocationInfo(
      authClient,
      req.user,
      beforeDeleteMetadata.parents?.[0]
    );

    const folder = await deleteFolder(authClient, {
      folderId,
    });

    clearUserFolderListCache(req.user);

    if (!folder.alreadyTrashed) {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "FOLDER_DELETE",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        folderId,
        folderName: folder.name || beforeDeleteMetadata.name,
        parentFolderId: locationInfo.parentFolderId,
        parentFolderName: locationInfo.parentFolderName,
        locationType: locationInfo.locationType,
      });
    }

    res.json({
      success: true,
      message: folder.alreadyTrashed
        ? "Folder was already in trash"
        : "Folder moved to trash successfully",
      alreadyTrashed: folder.alreadyTrashed,
      folder,
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to delete folder",
    });
  }
});

module.exports = router;