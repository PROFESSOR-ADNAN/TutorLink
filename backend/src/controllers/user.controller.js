const User = require("../models/User.model");
const cloudinary = require("../config/cloudinary");
const { AppError } = require("../middleware/error.middleware");
const catchAsync = require("../utils/catchAsync");

exports.getAll = catchAsync(async (req, res, next) => {
  const users = await User.find().sort("-createdAt");
  res.status(200).json({ users });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // Disallow password changes here — use /auth/update-password
  const { password, role, isAdmin, ...updates } = req.body;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ user });
});

// ─── Avatar upload ─────────────────────────────────────────
// multer-storage-cloudinary has already streamed the file to Cloudinary by
// the time this handler runs — req.file.path is the resulting secure URL,
// req.file.filename is the public_id we need to delete it later.
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError("No image file provided", 400));

  const user = await User.findById(req.user._id);
  const oldPublicId = user.avatarPublicId;

  user.avatar = req.file.path;
  user.avatarPublicId = req.file.filename;
  await user.save({ validateBeforeSave: false });

  // Clean up the old image so we don't accumulate orphaned uploads —
  // done after the new one is saved, and failure here shouldn't fail the request.
  if (oldPublicId) {
    cloudinary.uploader.destroy(oldPublicId).catch((err) =>
      console.error("Failed to delete old avatar from Cloudinary:", err.message),
    );
  }

  res.status(200).json({ user });
});

// ─── Cover image upload ────────────────────────────────────
exports.uploadCoverImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError("No image file provided", 400));

  const user = await User.findById(req.user._id);
  const oldPublicId = user.coverImagePublicId;

  user.coverImage = req.file.path;
  user.coverImagePublicId = req.file.filename;
  await user.save({ validateBeforeSave: false });

  if (oldPublicId) {
    cloudinary.uploader.destroy(oldPublicId).catch((err) =>
      console.error("Failed to delete old cover image from Cloudinary:", err.message),
    );
  }

  res.status(200).json({ user });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  res.cookie("token", "", { expires: new Date(0), httpOnly: true });
  res.status(204).json({ message: "Account deactivated" });
});
