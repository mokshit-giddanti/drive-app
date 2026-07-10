const nodemailer = require("nodemailer");

const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
};

const formatBytes = (bytes) => {
  const value = Number(bytes || 0);

  if (!value) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(value) / Math.log(1024));

  return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};

const sendStorageAlertEmail = async ({
  to,
  threshold,
  usedPercent,
  usage,
  limit,
}) => {
  if (!isEmailConfigured()) {
    return {
      sent: false,
      reason: "SMTP not configured",
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = `Drive storage alert: ${threshold}% reached`;

  const text = `
Your Google Drive storage has crossed ${threshold}%.

Current usage: ${usedPercent.toFixed(2)}%
Used: ${formatBytes(usage)}
Limit: ${formatBytes(limit)}

Please clean up files or upgrade storage if needed.
`;

  const response = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });

  return {
    sent: true,
    messageId: response.messageId,
  };
};

module.exports = {
  sendStorageAlertEmail,
};