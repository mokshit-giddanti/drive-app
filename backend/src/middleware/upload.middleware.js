const fs = require("fs");
const os = require("os");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(os.tmpdir(), "drive-vault-uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDir);
  },

  filename(req, file, callback) {
    const safeOriginalName = file.originalname.replace(/[^\w.\-() ]/g, "_");

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}-${safeOriginalName}`;

    callback(null, uniqueName);
  },
});

const upload = multer({
  storage,
});

module.exports = upload;