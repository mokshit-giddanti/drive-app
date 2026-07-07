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

const router = express.Router();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
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

    const folder = await createFolder(authClient, {
      name: name.trim(),
      parentFolderId: finalParentFolderId,
    });

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FOLDER_CREATE",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      folderId: folder.id,
      folderName: folder.name,
      parentFolderId: finalParentFolderId,
    });

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder,
    });
  } catch (error) {
    console.error("Create folder error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create folder",
      error: error.message,
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

    const folders = await listFolders(authClient, {
      parentFolderId: finalParentFolderId,
    });

    res.json({
      success: true,
      count: folders.length,
      folders,
    });
  } catch (error) {
    console.error("List folders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to list folders",
      error: error.message,
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

    const authClient = getUserAuthClient(req.user);

    const folder = await renameFolder(authClient, {
      folderId,
      name: name.trim(),
    });

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FOLDER_RENAME",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      folderId: folder.id,
      folderName: folder.name,
    });

    res.json({
      success: true,
      message: "Folder renamed successfully",
      folder,
    });
  } catch (error) {
    console.error("Rename folder error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to rename folder",
      error: error.message,
    });
  }
});

router.delete("/:folderId", authMiddleware, async (req, res) => {
  try {
    const { folderId } = req.params;

    const authClient = getUserAuthClient(req.user);

    const folder = await deleteFolder(authClient, {
      folderId,
    });

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "FOLDER_DELETE",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
      folderId,
    });

    res.json({
      success: true,
      message: "Folder moved to trash successfully",
      folder,
    });
  } catch (error) {
    console.error("Delete folder error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete folder",
      error: error.message,
    });
  }
});

module.exports = router;