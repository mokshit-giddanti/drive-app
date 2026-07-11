const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    picture: {
      type: String,
      default: "",
    },

    googleRefreshToken: {
      type: String,
      default: "",
    },

    passwordHash: {
      type: String,
      default: "",
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },

    driveFolders: {
      root: {
        type: String,
        default: "",
      },
      uploads: {
        type: String,
        default: "",
      },
      logs: {
        type: String,
        default: "",
      },
      system: {
        type: String,
        default: "",
      },
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);