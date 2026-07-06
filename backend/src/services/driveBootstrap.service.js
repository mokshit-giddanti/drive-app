const { google } = require("googleapis");

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const APP_PROPERTIES = {
  vaultApp: "private-file-vault",
};

const FOLDER_NAMES = {
  root: "Private File Vault",
  uploads: "uploads",
  logs: "logs",
  system: "system",
};

const escapeDriveQueryValue = (value) => {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
};

const getDriveClient = (authClient) => {
  return google.drive({
    version: "v3",
    auth: authClient,
  });
};

const findFolderByRole = async (drive, role, parentId = null) => {
  const queryParts = [
    `mimeType='${FOLDER_MIME_TYPE}'`,
    "trashed=false",
    `appProperties has { key='vaultApp' and value='${APP_PROPERTIES.vaultApp}' }`,
    `appProperties has { key='folderRole' and value='${role}' }`,
  ];

  if (parentId) {
    queryParts.push(`'${escapeDriveQueryValue(parentId)}' in parents`);
  }

  const response = await drive.files.list({
    q: queryParts.join(" and "),
    spaces: "drive",
    fields: "files(id, name, appProperties)",
    pageSize: 1,
  });

  return response.data.files?.[0] || null;
};

const createFolder = async (drive, role, parentId = null) => {
  const fileMetadata = {
    name: FOLDER_NAMES[role],
    mimeType: FOLDER_MIME_TYPE,
    appProperties: {
      ...APP_PROPERTIES,
      folderRole: role,
    },
  };

  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, appProperties",
  });

  return response.data;
};

const findOrCreateFolder = async (drive, role, parentId = null) => {
  const existingFolder = await findFolderByRole(drive, role, parentId);

  if (existingFolder) {
    return existingFolder;
  }

  return createFolder(drive, role, parentId);
};

const ensureAppFolders = async (authClient) => {
  const drive = getDriveClient(authClient);

  const rootFolder = await findOrCreateFolder(drive, "root");

  const uploadsFolder = await findOrCreateFolder(
    drive,
    "uploads",
    rootFolder.id
  );

  const logsFolder = await findOrCreateFolder(drive, "logs", rootFolder.id);

  const systemFolder = await findOrCreateFolder(
    drive,
    "system",
    rootFolder.id
  );

  return {
    root: rootFolder.id,
    uploads: uploadsFolder.id,
    logs: logsFolder.id,
    system: systemFolder.id,
  };
};

module.exports = {
  ensureAppFolders,
};