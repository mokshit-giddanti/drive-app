const jwt = require("jsonwebtoken");

const User = require("../models/user.model");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.googleRefreshToken) {
      return res.status(401).json({
        success: false,
        code: "GOOGLE_LOGIN_REQUIRED",
        message: "Google Drive permission missing. Please login with Google again.",
      });
    }

    const tokenVersionFromToken = Number(decoded.tokenVersion || 0);
    const currentTokenVersion = Number(user.tokenVersion || 0);

    if (tokenVersionFromToken !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_REVOKED",
        message: "Session expired. Please login again.",
      });
    }

    req.user = user;

    req.auth = {
      authProvider: decoded.authProvider || "unknown",
      userId: decoded.userId,
      googleId: decoded.googleId,
      email: decoded.email,
      tokenVersion: tokenVersionFromToken,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};

module.exports = authMiddleware;