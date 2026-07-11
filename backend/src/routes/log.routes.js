const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { createOAuth2Client } = require("../config/google");

const {
  listLogFiles,
  readLogsByDate,
  readRecentLogs,
} = require("../services/logReader.service");

const router = express.Router();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    const authClient = getUserAuthClient(req.user);

    const logs = await readRecentLogs(authClient, req.user.driveFolders.logs, {
      limit,
    });

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Read recent logs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to read recent logs",
      error: error.message,
    });
  }
});

router.get("/dates", authMiddleware, async (req, res) => {
  try {
    const authClient = getUserAuthClient(req.user);

    const files = await listLogFiles(authClient, req.user.driveFolders.logs);

    res.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    console.error("List log files error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to list log files",
      error: error.message,
    });
  }
});

router.get("/:date", authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    const authClient = getUserAuthClient(req.user);

    const result = await readLogsByDate(
      authClient,
      req.user.driveFolders.logs,
      date
    );

    res.json({
      success: true,
      date,
      file: result.file,
      count: result.logs.length,
      logs: result.logs,
    });
  } catch (error) {
    console.error("Read logs by date error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to read logs by date",
      error: error.message,
    });
  }
});

module.exports = router;