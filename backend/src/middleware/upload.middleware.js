const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Separate folders so avatars and cover photos don't collide, and so we can
// apply different crop/size transformations appropriate to each (a square
// avatar vs. a wide banner).
const makeStorage = (folder, transformation) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `tutorlink/${folder}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation,
    },
  });

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"), false);
  }
  cb(null, true);
};

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const COVER_MAX_BYTES = 8 * 1024 * 1024; // 8MB

exports.uploadAvatar = multer({
  storage: makeStorage("avatars", [{ width: 400, height: 400, crop: "fill", gravity: "face" }]),
  fileFilter: imageFileFilter,
  limits: { fileSize: AVATAR_MAX_BYTES },
}).single("image");

exports.uploadCoverImage = multer({
  storage: makeStorage("covers", [{ width: 1500, height: 500, crop: "fill" }]),
  fileFilter: imageFileFilter,
  limits: { fileSize: COVER_MAX_BYTES },
}).single("image");
