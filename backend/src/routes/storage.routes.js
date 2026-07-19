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

const STORAGE_STATUS_CACHE_TTL_MS = 60 * 1000;
const storageStatusCache = new Map();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

const getStorageCacheKey = (user) => {
  return String(user._id);
};

const getCachedStorageStatus = (user) => {
  const cacheKey = getStorageCacheKey(user);
  const cached = storageStatusCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    storageStatusCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
};

const setCachedStorageStatus = (user, payload) => {
  const cacheKey = getStorageCacheKey(user);

  storageStatusCache.set(cacheKey, {
    expiresAt: Date.now() + STORAGE_STATUS_CACHE_TTL_MS,
    payload,
  });
};

const clearCachedStorageStatus = (user) => {
  const cacheKey = getStorageCacheKey(user);
  storageStatusCache.delete(cacheKey);
};

router.get("/status", authMiddleware, async (req, res) => {
  try {
    const forceRefresh = String(req.query.refresh || "").toLowerCase() === "true";

    if (!forceRefresh) {
      const cachedPayload = getCachedStorageStatus(req.user);

      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }
    }

    const authClient = getUserAuthClient(req.user);

    const status = await getStorageStatus(authClient);

    const { alertState } = await getAlertState(
      authClient,
      req.user.driveFolders.system
    );

    const payload = {
      success: true,
      status,
      alertState,
    };

    setCachedStorageStatus(req.user, payload);

    res.json({
      ...payload,
      cached: false,
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
        usage: result.status?.usage,
        limit: result.status?.limit,
        usageInDriveTrash: result.status?.usageInDriveTrash,
        usedPercent: result.status?.usedPercent,
      });
    } else {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "STORAGE_CHECK",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
        usage: result.status?.usage,
        limit: result.status?.limit,
        usageInDriveTrash: result.status?.usageInDriveTrash,
        usedPercent: result.status?.usedPercent,
      });
    }

    const { alertState } = await getAlertState(
      authClient,
      req.user.driveFolders.system
    );

    setCachedStorageStatus(req.user, {
      success: true,
      status: result.status,
      alertState,
    });

    res.json({
      success: true,
      message: "Storage alert check completed",
      ...result,
      alertState,
      cached: false,
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

    clearCachedStorageStatus(req.user);

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