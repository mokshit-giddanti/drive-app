const { google } = require("googleapis");

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const getDriveClient = (authClient) => {
  return google.drive({
    version: "v3",
    auth: authClient,
  });
};

const escapeDriveQueryValue = (value) => {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
};

const createFolder = async (authClient, { name, parentFolderId }) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentFolderId],
    },
    fields: "id, name, mimeType, parents, createdTime, modifiedTime",
  });

  return response.data;
};

const listFolders = async (authClient, { parentFolderId }) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(parentFolderId)}' in parents`,
      "trashed=false",
      `mimeType='${FOLDER_MIME_TYPE}'`,
    ].join(" and "),
    spaces: "drive",
    fields: "files(id, name, mimeType, parents, createdTime, modifiedTime)",
    orderBy: "modifiedTime desc",
  });

  return response.data.files || [];
};

const renameFolder = async (authClient, { folderId, name }) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.update({
    fileId: folderId,
    requestBody: {
      name,
    },
    fields: "id, name, mimeType, parents, modifiedTime",
  });

  return response.data;
};

const deleteFolder = async (authClient, { folderId }) => {
  const drive = getDriveClient(authClient);

  const metadataResponse = await drive.files.get({
    fileId: folderId,
    fields: "id, name, trashed",
  });

  if (metadataResponse.data.trashed) {
    return {
      ...metadataResponse.data,
      alreadyTrashed: true,
    };
  }

  const response = await drive.files.update({
    fileId: folderId,
    requestBody: {
      trashed: true,
    },
    fields: "id, name, trashed",
  });

  return {
    ...response.data,
    alreadyTrashed: false,
  };
};

module.exports = {
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder,
};