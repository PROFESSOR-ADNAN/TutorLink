const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth.middleware");

const {
  getAll,
  getSupportContact,
  updateMe,
  deleteMe,
  uploadAvatar,
  uploadCoverImage,
} = require("../controllers/user.controller");
const { uploadAvatar: avatarUpload, uploadCoverImage: coverUpload } = require("../middleware/upload.middleware");

// Admin: list all users
router.get("/", protect, restrictTo("admin"), getAll);

// Any logged-in user: find the admin account to message for support
router.get("/support-contact", protect, getSupportContact);

// Update current user's profile (name, bio, etc. — text fields only)
router.patch("/me", protect, updateMe);

// Image uploads — separate endpoints since they're multipart, not JSON
router.post("/me/avatar", protect, avatarUpload, uploadAvatar);
router.post("/me/cover", protect, coverUpload, uploadCoverImage);

// Deactivate account
router.delete("/me", protect, deleteMe);

module.exports = router;
