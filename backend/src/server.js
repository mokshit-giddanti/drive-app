const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const connectDB = require("./config/db");
const { oauth2Client } = require("./config/google");
const User = require("./models/user.model");
const { ensureAppFolders } = require("./services/driveBootstrap.service");
const { writeDailyLog } = require("./services/log.service");

const { google } = require("googleapis");
const folderRoutes = require("./routes/folder.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/folders", folderRoutes);

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
    try {
  await writeDailyLog(oauth2Client, dbUser.driveFolders.logs, {
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

    const appToken = jwt.sign(
      {
        userId: dbUser._id,
        googleId: dbUser.googleId,
        email: dbUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

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

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});