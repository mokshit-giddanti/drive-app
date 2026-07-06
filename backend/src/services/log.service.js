const { google } = require("googleapis");
const { Readable } = require("stream");

const LOG_MIME_TYPE = "application/jsonl";

const APP_PROPERTIES = {
  vaultApp: "private-file-vault",
};

const getDriveClient = (authClient) => {
  return google.drive({
    version: "v3",
    auth: authClient,
  });
};

const getTodayLogFileName = () => {
  const today = new Date().toISOString().split("T")[0];
  return `${today}.log.jsonl`;
};

const escapeDriveQueryValue = (value) => {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
};

const streamToString = async (stream) => {
  const chunks = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
};

const findTodayLogFile = async (drive, logsFolderId) => {
  const fileName = getTodayLogFileName();
  const escapedFileName = escapeDriveQueryValue(fileName);

  const response = await drive.files.list({
    q: [
      `name='${escapedFileName}'`,
      `'${escapeDriveQueryValue(logsFolderId)}' in parents`,
      "trashed=false",
      `appProperties has { key='vaultApp' and value='${APP_PROPERTIES.vaultApp}' }`,
      `appProperties has { key='fileRole' and value='dailyLog' }`,
    ].join(" and "),
    spaces: "drive",
    fields: "files(id, name)",
    pageSize: 1,
  });

  return response.data.files?.[0] || null;
};

const createTodayLogFile = async (drive, logsFolderId, logLine) => {
  const fileName = getTodayLogFileName();
  const logDate = fileName.replace(".log.jsonl", "");

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: LOG_MIME_TYPE,
      parents: [logsFolderId],
      appProperties: {
        ...APP_PROPERTIES,
        fileRole: "dailyLog",
        logDate,
      },
    },
    media: {
      mimeType: LOG_MIME_TYPE,
      body: Readable.from([`${logLine}\n`]),
    },
    fields: "id, name",
  });

  return response.data;
};

const appendToExistingLogFile = async (drive, logFileId, logLine) => {
  const existingFile = await drive.files.get(
    {
      fileId: logFileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  );

  const existingContent = await streamToString(existingFile.data);
  const updatedContent = `${existingContent}${logLine}\n`;

  const response = await drive.files.update({
    fileId: logFileId,
    media: {
      mimeType: LOG_MIME_TYPE,
      body: Readable.from([updatedContent]),
    },
    fields: "id, name",
  });

  return response.data;
};

const writeDailyLog = async (authClient, logsFolderId, logData) => {
  const drive = getDriveClient(authClient);

  const logEntry = {
    timestamp: new Date().toISOString(),
    ...logData,
  };

  const logLine = JSON.stringify(logEntry);

  const todayLogFile = await findTodayLogFile(drive, logsFolderId);

  if (!todayLogFile) {
    return createTodayLogFile(drive, logsFolderId, logLine);
  }

  return appendToExistingLogFile(drive, todayLogFile.id, logLine);
};

module.exports = {
  writeDailyLog,
};