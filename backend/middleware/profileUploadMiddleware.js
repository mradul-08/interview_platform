const multer = require("multer");

const imageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const resumeTypes = new Set(["application/pdf"]);

function buildUpload(allowed, maxSize, label) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize, files: 1 },
    fileFilter: (req, file, callback) => {
      if (!allowed.has(file.mimetype)) return callback(new Error(`${label} must be a supported file type`));
      callback(null, true);
    },
  });
}

const uploadAvatar = buildUpload(imageTypes, 5 * 1024 * 1024, "Avatar");
const uploadResume = buildUpload(resumeTypes, 10 * 1024 * 1024, "Resume");

module.exports = { uploadAvatar, uploadResume };
