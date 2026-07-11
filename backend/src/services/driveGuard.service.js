const { google } = require("googleapis");

const getDriveClient = (authClient) => {
  return google.drive({
    version: "v3",
    auth: authClient,
  });
};

const getFileMetadata = async (authClient, fileId) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, parents, trashed",
  });

  return response.data;
};

const isInsideFolderTree = async (authClient, fileId, rootFolderId) => {
  if (!fileId || !rootFolderId) return false;

  if (fileId === rootFolderId) return true;

  const visited = new Set();
  const queue = [fileId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);

    if (currentId === rootFolderId) return true;

    const metadata = await getFileMetadata(authClient, currentId);

    const parents = metadata.parents || [];

    for (const parentId of parents) {
      if (parentId === rootFolderId) return true;
      queue.push(parentId);
    }
  }

  return false;
};

const assertUserContentAccess = async (
  authClient,
  user,
  fileId,
  { allowTrashed = false } = {}
) => {
  const uploadsFolderId = user.driveFolders?.uploads;

  if (!uploadsFolderId) {
    const error = new Error("Uploads folder not found. Please login again.");
    error.statusCode = 400;
    throw error;
  }

  const metadata = await getFileMetadata(authClient, fileId);

  if (metadata.trashed && !allowTrashed) {
    const error = new Error("File/folder is already in trash.");
    error.statusCode = 404;
    throw error;
  }

  const allowed = await isInsideFolderTree(authClient, fileId, uploadsFolderId);

  if (!allowed) {
    const error = new Error("Access denied. This item is outside your uploads folder.");
    error.statusCode = 403;
    throw error;
  }

  return metadata;
};

const isProtectedVaultFolder = (user, folderId) => {
  const protectedIds = [
    user.driveFolders?.root,
    user.driveFolders?.uploads,
    user.driveFolders?.logs,
    user.driveFolders?.system,
  ].filter(Boolean);

  return protectedIds.includes(folderId);
};

module.exports = {
  getFileMetadata,
  isInsideFolderTree,
  assertUserContentAccess,
  isProtectedVaultFolder,
};