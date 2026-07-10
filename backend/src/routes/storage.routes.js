const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { createOAuth2Client } = require("../config/google");
const { writeDailyLog } = require("../services/log.service");

const {
  getStorageStatus,
  getAlertState,
  checkStorageAlerts,
  resetStorageAlerts,
} = require("../services/storage.service");

const router = express.Router();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

router.get("/status", authMiddleware, async (req, res) => {
  try {
    const authClient = getUserAuthClient(req.user);

    const status = await getStorageStatus(authClient);

    const { alertState } = await getAlertState(
      authClient,
      req.user.driveFolders.system
    );

    res.json({
      success: true,
      status,
      alertState,
    });
  } catch (error) {
    console.error("Storage status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get storage status",
      error: error.message,
    });
  }
});

router.post("/check-alerts", authMiddleware, async (req, res) => {
  try {
    const authClient = getUserAuthClient(req.user);

    const result = await checkStorageAlerts(
      authClient,
      req.user.driveFolders.system,
      {
        alertEmail: req.user.email,
      }
    );

    if (result.alertsTriggered.length > 0) {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "STORAGE_ALERT_TRIGGERED",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        alertsTriggered: result.alertsTriggered,
        emailResults: result.emailResults,
      });
    } else {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "STORAGE_CHECK",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        usedPercent: result.status.usedPercent,
      });
    }

    res.json({
      success: true,
      message: "Storage alert check completed",
      ...result,
    });
  } catch (error) {
    console.error("Storage alert check error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check storage alerts",
      error: error.message,
    });
  }
});

router.post("/reset-alerts", authMiddleware, async (req, res) => {
  try {
    const authClient = getUserAuthClient(req.user);

    const result = await resetStorageAlerts(
      authClient,
      req.user.driveFolders.system
    );

    await writeDailyLog(authClient, req.user.driveFolders.logs, {
      action: "STORAGE_ALERTS_RESET",
      status: "SUCCESS",
      userId: String(req.user._id),
      email: req.user.email,
    });

    res.json({
      success: true,
      message: "Storage alerts reset successfully",
      ...result,
    });
  } catch (error) {
    console.error("Storage alerts reset error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reset storage alerts",
      error: error.message,
    });
  }
});

module.exports = router;