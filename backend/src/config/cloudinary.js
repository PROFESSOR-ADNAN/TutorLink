const cloudinary = require("cloudinary").v2;

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

// Fail loudly at boot, not silently during someone's first upload attempt.
// A missing/placeholder credential here is exactly what causes uploads to
// fail in confusing ways downstream (multer-storage-cloudinary can't
// authenticate with Cloudinary, so the file never actually gets attached
// to the request the way the upload handler expects).
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    "⚠️  Cloudinary credentials are missing or incomplete (CLOUDINARY_CLOUD_NAME / " +
      "CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET). Avatar/cover photo uploads will fail " +
      "until all three are set in backend/.env — and remember: if you're running this in " +
      "Docker, changing .env alone does NOT update an already-running container. You need " +
      "to recreate it, e.g. `docker-compose up -d --build backend`.",
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
