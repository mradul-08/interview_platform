const cloudinary = require("cloudinary").v2;

function readCloudinaryConfig() {
  const environmentUrl = String(process.env.CLOUDINARY_URL || "").trim();
  if (environmentUrl) {
    try {
      const parsed = new URL(environmentUrl);
      if (parsed.protocol === "cloudinary:") {
        return {
          cloud_name: parsed.hostname.trim(),
          api_key: decodeURIComponent(parsed.username),
          api_secret: decodeURIComponent(parsed.password),
        };
      }
    } catch {
      // Fall back to the individual variables below so the error remains actionable.
    }
  }
  return {
    cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME || "").trim(),
    api_key: String(process.env.CLOUDINARY_API_KEY || "").trim(),
    api_secret: String(process.env.CLOUDINARY_API_SECRET || "").trim(),
  };
}

const cloudinaryConfig = readCloudinaryConfig();
cloudinary.config(cloudinaryConfig);

const isConfigured = () => Boolean(
  cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret,
);

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "codeverse/group-attachments", resource_type: "auto", ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

function deleteAsset(publicId, options = {}) {
  if (!publicId) return Promise.resolve(null);
  return cloudinary.uploader.destroy(publicId, options);
}

module.exports = { cloudinary, isConfigured, uploadBuffer, deleteAsset };
