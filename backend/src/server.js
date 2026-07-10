const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectDB = require("./config/db");
const { oauth2Client, createOAuth2Client } = require("./config/google");

const User = require("./models/user.model");

const authMiddleware = require("./middleware/auth.middleware");

const { ensureAppFolders } = require("./services/driveBootstrap.service");
const { writeDailyLog } = require("./services/log.service");

const folderRoutes = require("./routes/folder.routes");

const { google } = require("googleapis");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/folders", folderRoutes);

const createAppToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      googleId: user.googleId,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const getUserAuthClient = (user) => {
  const authClient = createOAuth2Client();

  authClient.setCredentials({
    refresh_token: user.googleRefreshToken,
  });

  return authClient;
};

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Drive backend is live",
  });
});

app.get("/api/auth/google", (req, res) => {
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(authUrl);
});

app.get("/api/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing",
      });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const { data: googleUser } = await oauth2.userinfo.get();

    const updateData = {
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      lastLoginAt: new Date(),
    };

    if (tokens.refresh_token) {
      updateData.googleRefreshToken = tokens.refresh_token;
    }

    let dbUser = await User.findOneAndUpdate(
      { googleId: googleUser.id },
      { $set: updateData },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    const driveFolders = await ensureAppFolders(oauth2Client);

    dbUser = await User.findByIdAndUpdate(
      dbUser._id,
      {
        $set: {
          driveFolders,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    const authClient = getUserAuthClient(dbUser);

    try {
      await writeDailyLog(authClient, dbUser.driveFolders.logs, {
        action: "LOGIN_SUCCESS",
        status: "SUCCESS",
        userId: String(dbUser._id),
        googleId: dbUser.googleId,
        email: dbUser.email,
        name: dbUser.name,
      });
    } catch (logError) {
      console.error("Login log write failed:", logError.message);
    }

    const appToken = createAppToken(dbUser);

    res.json({
      success: true,
      message: "Google login successful",
      user: {
        id: dbUser._id,
        googleId: dbUser.googleId,
        email: dbUser.email,
        name: dbUser.name,
        picture: dbUser.picture,
      },
      driveFolders: dbUser.driveFolders,
      token: appToken,
      hasGoogleRefreshToken: Boolean(dbUser.googleRefreshToken),
      receivedNewRefreshToken: Boolean(tokens.refresh_token),
      hasPassword: Boolean(dbUser.passwordHash),
    });
  } catch (error) {
    console.error("Google OAuth Error:", error);

    res.status(500).json({
      success: false,
      message: "Google login failed",
      error: error.message,
    });
  }
});

app.post("/api/auth/set-password", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const dbUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          passwordHash,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    const authClient = getUserAuthClient(dbUser);

    try {
      await writeDailyLog(authClient, dbUser.driveFolders.logs, {
        action: "PASSWORD_SET",
        status: "SUCCESS",
        userId: String(dbUser._id),
        email: dbUser.email,
      });
    } catch (logError) {
      console.error("Password set log failed:", logError.message);
    }

    res.json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("Set password error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to set password",
      error: error.message,
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const dbUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        code: "GOOGLE_LOGIN_REQUIRED",
        message: "User not found. Please login with Google first.",
        googleLoginUrl: `${req.protocol}://${req.get("host")}/api/auth/google`,
      });
    }

    if (!dbUser.googleRefreshToken) {
      return res.status(403).json({
        success: false,
        code: "GOOGLE_LOGIN_REQUIRED",
        message:
          "Google Drive permission missing. Please login with Google again.",
        googleLoginUrl: `${req.protocol}://${req.get("host")}/api/auth/google`,
      });
    }

    if (!dbUser.passwordHash) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_SETUP_REQUIRED",
        message: "Password not set. Login with Google once and set password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    dbUser.lastLoginAt = new Date();
    await dbUser.save();

    const authClient = getUserAuthClient(dbUser);

    try {
      await writeDailyLog(authClient, dbUser.driveFolders.logs, {
        action: "PASSWORD_LOGIN_SUCCESS",
        status: "SUCCESS",
        userId: String(dbUser._id),
        email: dbUser.email,
      });
    } catch (logError) {
      console.error("Password login log failed:", logError.message);
    }

    const appToken = createAppToken(dbUser);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: dbUser._id,
        googleId: dbUser.googleId,
        email: dbUser.email,
        name: dbUser.name,
        picture: dbUser.picture,
      },
      driveFolders: dbUser.driveFolders,
      token: appToken,
    });
  } catch (error) {
    console.error("Email login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});