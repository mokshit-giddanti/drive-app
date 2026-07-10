const { google } = require("googleapis");
const { Readable } = require("stream");

const { sendStorageAlertEmail } = require("./notification.service");

const ALERT_FILE_NAME = "storage-alerts.json";
const ALERT_MIME_TYPE = "application/json";

const APP_PROPERTIES = {
  vaultApp: "private-file-vault",
  fileRole: "storageAlerts",
};

const ALERT_THRESHOLDS = [50, 75, 90];

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

const getDefaultAlertState = () => {
  return {
    alertsSent: {
      50: false,
      75: false,
      90: false,
    },
    lastCheckedAt: null,
    lastUsagePercent: null,
    lastStorageQuota: null,
    alertHistory: [],
  };
};

const getStorageStatus = async (authClient) => {
  const drive = getDriveClient(authClient);

  const response = await drive.about.get({
    fields: "storageQuota",
  });

  const quota = response.data.storageQuota || {};

  const usage = Number(quota.usage || 0);
  const limit = quota.limit ? Number(quota.limit) : null;
  const usageInDrive = Number(quota.usageInDrive || 0);
  const usageInDriveTrash = Number(quota.usageInDriveTrash || 0);

  const usedPercent = limit ? Number(((usage / limit) * 100).toFixed(4)) : null;

  return {
    usage,
    limit,
    usageInDrive,
    usageInDriveTrash,
    usedPercent,
    hasLimit: Boolean(limit),
    raw: quota,
  };
};

const findAlertFile = async (drive, systemFolderId) => {
  const response = await drive.files.list({
    q: [
      `name='${escapeDriveQueryValue(ALERT_FILE_NAME)}'`,
      `'${escapeDriveQueryValue(systemFolderId)}' in parents`,
      "trashed=false",
      `appProperties has { key='vaultApp' and value='${APP_PROPERTIES.vaultApp}' }`,
      `appProperties has { key='fileRole' and value='${APP_PROPERTIES.fileRole}' }`,
    ].join(" and "),
    spaces: "drive",
    fields: "files(id, name)",
    pageSize: 1,
  });

  return response.data.files?.[0] || null;
};

const readAlertState = async (drive, alertFileId) => {
  const response = await drive.files.get(
    {
      fileId: alertFileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  );

  const content = await streamToString(response.data);

  if (!content.trim()) {
    return getDefaultAlertState();
  }

  return {
    ...getDefaultAlertState(),
    ...JSON.parse(content),
  };
};

const saveAlertState = async (drive, systemFolderId, alertFileId, alertState) => {
  const body = Readable.from([JSON.stringify(alertState, null, 2)]);

  if (alertFileId) {
    const response = await drive.files.update({
      fileId: alertFileId,
      media: {
        mimeType: ALERT_MIME_TYPE,
        body,
      },
      fields: "id, name",
    });

    return response.data;
  }

  const response = await drive.files.create({
    requestBody: {
      name: ALERT_FILE_NAME,
      mimeType: ALERT_MIME_TYPE,
      parents: [systemFolderId],
      appProperties: APP_PROPERTIES,
    },
    media: {
      mimeType: ALERT_MIME_TYPE,
      body,
    },
    fields: "id, name",
  });

  return response.data;
};

const getAlertState = async (authClient, systemFolderId) => {
  const drive = getDriveClient(authClient);

  const alertFile = await findAlertFile(drive, systemFolderId);

  if (!alertFile) {
    return {
      alertFileId: null,
      alertState: getDefaultAlertState(),
    };
  }

  const alertState = await readAlertState(drive, alertFile.id);

  return {
    alertFileId: alertFile.id,
    alertState,
  };
};

const checkStorageAlerts = async (
  authClient,
  systemFolderId,
  { alertEmail } = {}
) => {
  const drive = getDriveClient(authClient);

  const status = await getStorageStatus(authClient);

  const { alertFileId, alertState } = await getAlertState(
    authClient,
    systemFolderId
  );

  const alertsTriggered = [];
  const emailResults = [];

  alertState.lastCheckedAt = new Date().toISOString();
  alertState.lastUsagePercent = status.usedPercent;
  alertState.lastStorageQuota = {
    usage: status.usage,
    limit: status.limit,
    usageInDrive: status.usageInDrive,
    usageInDriveTrash: status.usageInDriveTrash,
  };

  if (status.usedPercent !== null) {
    for (const threshold of ALERT_THRESHOLDS) {
      const key = String(threshold);

      if (status.usedPercent >= threshold && !alertState.alertsSent[key]) {
        alertState.alertsSent[key] = true;

        const alertRecord = {
          threshold,
          usedPercent: status.usedPercent,
          usage: status.usage,
          limit: status.limit,
          triggeredAt: new Date().toISOString(),
        };

        alertsTriggered.push(alertRecord);

        let emailResult = {
          sent: false,
          reason: "No alert email provided",
        };

        if (alertEmail) {
          try {
            emailResult = await sendStorageAlertEmail({
              to: process.env.ALERT_EMAIL_TO || alertEmail,
              threshold,
              usedPercent: status.usedPercent,
              usage: status.usage,
              limit: status.limit,
            });
          } catch (emailError) {
            emailResult = {
              sent: false,
              reason: emailError.message,
            };
          }
        }

        const emailRecord = {
          threshold,
          ...emailResult,
        };

        emailResults.push(emailRecord);

        alertState.alertHistory.push({
          ...alertRecord,
          email: emailRecord,
        });
      }
    }
  }

  alertState.alertHistory = alertState.alertHistory.slice(-50);

  const savedFile = await saveAlertState(
    drive,
    systemFolderId,
    alertFileId,
    alertState
  );

  return {
    status,
    alertState,
    alertsTriggered,
    emailResults,
    alertFile: savedFile,
  };
};

const resetStorageAlerts = async (authClient, systemFolderId) => {
  const drive = getDriveClient(authClient);

  const { alertFileId, alertState } = await getAlertState(
    authClient,
    systemFolderId
  );

  alertState.alertsSent = {
    50: false,
    75: false,
    90: false,
  };

  alertState.resetAt = new Date().toISOString();

  const savedFile = await saveAlertState(
    drive,
    systemFolderId,
    alertFileId,
    alertState
  );

  return {
    alertState,
    alertFile: savedFile,
  };
};

module.exports = {
  getStorageStatus,
  getAlertState,
  checkStorageAlerts,
  resetStorageAlerts,
};