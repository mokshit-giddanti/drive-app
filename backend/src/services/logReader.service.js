const { google } = require("googleapis");

const getDriveClient = (authClient) => {
  return google.drive({
    version: "v3",
    auth: authClient,
  });
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

const parseJsonLines = (content) => {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {
          parseError: true,
          raw: line,
        };
      }
    });
};

const listLogFiles = async (authClient, logsFolderId, { limit = 30 } = {}) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(logsFolderId)}' in parents`,
      "trashed=false",
      "name contains '.log.jsonl'",
    ].join(" and "),
    spaces: "drive",
    fields: "files(id, name, size, createdTime, modifiedTime)",
    orderBy: "name desc",
    pageSize: limit,
  });

  return response.data.files || [];
};

const findLogFileByDate = async (authClient, logsFolderId, date) => {
  const drive = getDriveClient(authClient);

  const fileName = `${date}.log.jsonl`;

  const response = await drive.files.list({
    q: [
      `name='${escapeDriveQueryValue(fileName)}'`,
      `'${escapeDriveQueryValue(logsFolderId)}' in parents`,
      "trashed=false",
    ].join(" and "),
    spaces: "drive",
    fields: "files(id, name, size, createdTime, modifiedTime)",
    pageSize: 1,
  });

  return response.data.files?.[0] || null;
};

const readLogFile = async (authClient, fileId) => {
  const drive = getDriveClient(authClient);

  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  );

  const content = await streamToString(response.data);

  return parseJsonLines(content);
};

const readLogsByDate = async (authClient, logsFolderId, date) => {
  const logFile = await findLogFileByDate(authClient, logsFolderId, date);

  if (!logFile) {
    return {
      file: null,
      logs: [],
    };
  }

  const logs = await readLogFile(authClient, logFile.id);

  return {
    file: logFile,
    logs,
  };
};

const readRecentLogs = async (authClient, logsFolderId, { limit = 100 } = {}) => {
  const logFiles = await listLogFiles(authClient, logsFolderId, {
    limit: 10,
  });

  const allLogs = [];

  for (const file of logFiles) {
    const logs = await readLogFile(authClient, file.id);

    for (const log of logs) {
      allLogs.push({
        ...log,
        logFile: file.name,
      });
    }

    if (allLogs.length >= limit) break;
  }

  allLogs.sort((a, b) => {
    return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
  });

  return allLogs.slice(0, limit);
};

module.exports = {
  listLogFiles,
  readLogsByDate,
  readRecentLogs,
};