const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const connectDB = require("./config/db");
const oauth2Client = require("./config/google");
const User = require("./models/user.model");

const { google } = require("googleapis");

const app = express();

app.use(cors());
app.use(express.json());

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

    // Only update refresh token if Google sends a new one.
    // This prevents overwriting the old valid refresh token with undefined.
    if (tokens.refresh_token) {
      updateData.googleRefreshToken = tokens.refresh_token;
    }

    const dbUser = await User.findOneAndUpdate(
      { googleId: googleUser.id },
      { $set: updateData },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

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