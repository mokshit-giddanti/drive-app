const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const { google } = require("googleapis");

const connectDB = require("./config/db");
const { oauth2Client, createOAuth2Client } = require("./config/google");

const User = require("./models/user.model");

const authMiddleware = require("./middleware/auth.middleware");

const { ensureAppFolders } = require("./services/driveBootstrap.service");
const { writeDailyLog } = require("./services/log.service");

const folderRoutes = require("./routes/folder.routes");
const fileRoutes = require("./routes/file.routes");
const storageRoutes = require("./routes/storage.routes");
const { startSelfPing } = require("./services/selfPing.service");
const logRoutes = require("./routes/log.routes");

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/logs", logRoutes);

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

const getBackendUrl = (req) => {
  return process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
};

// const createAppToken = (user, authProvider) => {
//   return jwt.sign(
//     {
//       userId: user._id,
//       googleId: user.googleId,
//       email: user.email,
//       authProvider,
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// };
const createAppToken = (user, authProvider) => {
  return jwt.sign(
    {
      userId: user._id,
      googleId: user.googleId,
      email: user.email,
      authProvider,
      tokenVersion: user.tokenVersion || 0,
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

// app.get("/api/auth/google", (req, res) => {
//   const authUrl = oauth2Client.generateAuthUrl({
//     access_type: "offline",
//     prompt: "consent",
//     scope: googleScopes,
//   });

//   res.redirect(authUrl);
// });
app.get("/api/auth/google", (req, res) => {
  const mode = req.query.mode || "login";

  const state = Buffer.from(
    JSON.stringify({
      mode,
    })
  ).toString("base64url");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: googleScopes,
    state,
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
        action: "GOOGLE_LOGIN_SUCCESS",
        status: "SUCCESS",
        userId: String(dbUser._id),
        googleId: dbUser.googleId,
        email: dbUser.email,
        name: dbUser.name,
      });
    } catch (logError) {
      console.error("Google login log write failed:", logError.message);
    }

    const appToken = createAppToken(dbUser, "google");

    const hasPassword = Boolean(dbUser.passwordHash);

    // res.json({
    //   success: true,
    //   message: "Google login successful",
    //   user: {
    //     id: dbUser._id,
    //     googleId: dbUser.googleId,
    //     email: dbUser.email,
    //     name: dbUser.name,
    //     picture: dbUser.picture,
    //   },
    //   driveFolders: dbUser.driveFolders,
    //   token: appToken,
    //   hasGoogleRefreshToken: Boolean(dbUser.googleRefreshToken),
    //   receivedNewRefreshToken: Boolean(tokens.refresh_token),
    //   hasPassword,
    //   requiresPasswordSetup: !hasPassword,
    //   nextAction: hasPassword ? "GO_TO_DASHBOARD" : "SET_PASSWORD",
    // });
  let mode = "login";

try {
  if (req.query.state) {
    const parsedState = JSON.parse(
      Buffer.from(req.query.state, "base64url").toString("utf8")
    );

    mode = parsedState.mode || "login";
  }
} catch {
  mode = "login";
}

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

const nextPath =
  mode === "reset" || !hasPassword ? "/set-password" : "/dashboard";

const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(
  appToken
)}&next=${encodeURIComponent(nextPath)}`;

return res.redirect(redirectUrl);
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

    if (req.auth.authProvider !== "google") {
      return res.status(403).json({
        success: false,
        code: "GOOGLE_LOGIN_REQUIRED",
        message:
          "Password setup/reset requires Google login. Please login with Google again.",
        googleLoginUrl: `${getBackendUrl(req)}/api/auth/google`,
      });
    }

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
        action: "PASSWORD_SET_OR_RESET",
        status: "SUCCESS",
        userId: String(dbUser._id),
        email: dbUser.email,
      });
    } catch (logError) {
      console.error("Password set/reset log failed:", logError.message);
    }

    res.json({
      success: true,
      message: "Password set/reset successfully",
      hasPassword: true,
      nextAction: "LOGIN_WITH_EMAIL_PASSWORD",
    });
  } catch (error) {
    console.error("Set/reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to set/reset password",
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
        googleLoginUrl: `${getBackendUrl(req)}/api/auth/google`,
      });
    }

    if (!dbUser.googleRefreshToken) {
      return res.status(403).json({
        success: false,
        code: "GOOGLE_LOGIN_REQUIRED",
        message:
          "Google Drive permission missing. Please login with Google again.",
        googleLoginUrl: `${getBackendUrl(req)}/api/auth/google`,
      });
    }

    if (!dbUser.passwordHash) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_SETUP_REQUIRED",
        message: "Password not set. Login with Google once and set password.",
        googleLoginUrl: `${getBackendUrl(req)}/api/auth/google`,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        code: "INVALID_PASSWORD",
        message:
          "Invalid email or password. If you forgot your password, login with Google to reset it.",
        googleLoginUrl: `${getBackendUrl(req)}/api/auth/google`,
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

    const appToken = createAppToken(dbUser, "password");

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
      nextAction: "GO_TO_DASHBOARD",
    });
  } catch (error) {
    console.error("Email/password login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    const dbUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $inc: {
          tokenVersion: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    const authClient = getUserAuthClient(req.user);

    try {
      await writeDailyLog(authClient, req.user.driveFolders.logs, {
        action: "LOGOUT",
        status: "SUCCESS",
        userId: String(req.user._id),
        email: req.user.email,
      });
    } catch (logError) {
      console.error("Logout log failed:", logError.message);
    }

    res.json({
      success: true,
      message: "Logged out successfully",
      tokenRevoked: true,
      tokenVersion: dbUser.tokenVersion,
      nextAction: "LOGIN",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      googleId: req.user.googleId,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
    },
    driveFolders: req.user.driveFolders,
    authProvider: req.auth.authProvider,
    hasPassword: Boolean(req.user.passwordHash),
  });
});
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    startSelfPing();
  });
});