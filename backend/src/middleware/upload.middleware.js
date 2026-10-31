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

const AVATAR_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const COVER_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

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

// Verification documents (national ID, education certificates) can be a
// photo OR a PDF scan — unlike avatars/covers, we don't restrict to images
// only, and we don't apply any crop transformation since these need to
// stay as faithful originals for an admin to actually verify.
const documentFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, or PDF files are allowed"), false);
  }
  cb(null, true);
};

exports.uploadVerificationDocument = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "tutorlink/verification-docs",
      resource_type: "auto", // lets Cloudinary store PDFs correctly (not just images)
      allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
    },
  }),
  fileFilter: documentFileFilter,
  limits: { fileSize: DOCUMENT_MAX_BYTES },
}).single("document");
