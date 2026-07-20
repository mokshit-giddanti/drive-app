const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { createOAuth2Client } = require("../config/google");

const {
  listLogFiles,
  readLogsByDate,
  readRecentLogs,
} = require("../services/logReader.service");

const router = express.Router();

const RECENT_LOGS_CACHE_TTL_MS = 10 * 1000;
const LOG_DATES_CACHE_TTL_MS = 30 * 1000;
const DATE_LOGS_CACHE_TTL_MS = 30 * 1000;

const logsCache = new Map();

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

const getCacheValue = (key) => {
  const cached = logsCache.get(key);

  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    logsCache.delete(key);
    return null;
  }

  return cached.payload;
};

const setCacheValue = (key, payload, ttlMs) => {
  logsCache.set(key, {
    payload,
    expiresAt: Date.now() + ttlMs,
  });
};

const shouldForceRefresh = (req) => {
  return String(req.query.refresh || "").toLowerCase() === "true";
};

const getSafeLimit = (value) => {
  const limit = Number(value || 100);

  if (Number.isNaN(limit)) return 100;

  return Math.min(Math.max(limit, 1), 500);
};

router.get("/", authMiddleware, async (req, res) => {
  try {
    const limit = getSafeLimit(req.query.limit);
    const cacheKey = `${req.user._id}:recent:${limit}`;

    if (!shouldForceRefresh(req)) {
      const cachedPayload = getCacheValue(cacheKey);

      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }
    }

    const authClient = getUserAuthClient(req.user);

    const logs = await readRecentLogs(authClient, req.user.driveFolders.logs, {
      limit,
    });

    const payload = {
      success: true,
      count: logs.length,
      logs,
    };

    setCacheValue(cacheKey, payload, RECENT_LOGS_CACHE_TTL_MS);

    res.json({
      ...payload,
      cached: false,
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
    const cacheKey = `${req.user._id}:dates`;

    if (!shouldForceRefresh(req)) {
      const cachedPayload = getCacheValue(cacheKey);

      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }
    }

    const authClient = getUserAuthClient(req.user);

    const files = await listLogFiles(authClient, req.user.driveFolders.logs);

    const payload = {
      success: true,
      count: files.length,
      files,
    };

    setCacheValue(cacheKey, payload, LOG_DATES_CACHE_TTL_MS);

    res.json({
      ...payload,
      cached: false,
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

    const cacheKey = `${req.user._id}:date:${date}`;

    if (!shouldForceRefresh(req)) {
      const cachedPayload = getCacheValue(cacheKey);

      if (cachedPayload) {
        return res.json({
          ...cachedPayload,
          cached: true,
        });
      }
    }

    const authClient = getUserAuthClient(req.user);

    const result = await readLogsByDate(
      authClient,
      req.user.driveFolders.logs,
      date
    );

    const payload = {
      success: true,
      date,
      file: result.file,
      count: result.logs.length,
      logs: result.logs,
    };

    setCacheValue(cacheKey, payload, DATE_LOGS_CACHE_TTL_MS);

    res.json({
      ...payload,
      cached: false,
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