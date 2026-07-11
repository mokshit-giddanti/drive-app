const { google } = require("googleapis");
const { Readable } = require("stream");

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

const bufferToStream = (buffer) => {
  return Readable.from(buffer);
};

const uploadFile = async (
  authClient,
  { fileBuffer, originalName, mimeType, parentFolderId }
) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.create({
    requestBody: {
      name: originalName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: bufferToStream(fileBuffer),
    },
    fields:
      "id, name, mimeType, size, parents, webViewLink, webContentLink, createdTime, modifiedTime",
  });

  return response.data;
};

const listFiles = async (authClient, { parentFolderId }) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(parentFolderId)}' in parents`,
      "trashed=false",
      `mimeType!='${FOLDER_MIME_TYPE}'`,
    ].join(" and "),
    spaces: "drive",
    fields:
      "files(id, name, mimeType, size, parents, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime)",
    orderBy: "modifiedTime desc",
  });

  return response.data.files || [];
};

const getFileDetails = async (authClient, { fileId }) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.get({
    fileId,
    fields:
      "id, name, mimeType, size, parents, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, trashed",
  });

  return response.data;
};

const downloadFile = async (authClient, { fileId }) => {
  const drive = getDriveClient(authClient);

  const metadataResponse = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
  });

  const streamResponse = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  );

  return {
    metadata: metadataResponse.data,
    stream: streamResponse.data,
  };
};

const renameFile = async (authClient, { fileId, name }) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.update({
    fileId,
    requestBody: {
      name,
    },
    fields:
      "id, name, mimeType, size, parents, webViewLink, webContentLink, modifiedTime",
  });

  return response.data;
};

const deleteFile = async (authClient, { fileId }) => {
  const drive = getDriveClient(authClient);

  const metadataResponse = await drive.files.get({
    fileId,
    fields: "id, name, trashed",
  });

  if (metadataResponse.data.trashed) {
    return {
      ...metadataResponse.data,
      alreadyTrashed: true,
    };
  }

  const response = await drive.files.update({
    fileId,
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
  uploadFile,
  listFiles,
  getFileDetails,
  downloadFile,
  renameFile,
  deleteFile,
};