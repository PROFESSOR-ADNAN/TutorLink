const router = require("express").Router();
const {
  getTutors,
  getTutor,
  createTutorProfile,
  updateTutorProfile,
  getMyProfile,
  deleteTutor,
  uploadVerificationDocument,
  deleteVerificationDocument,
} = require("../controllers/tutor.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { uploadVerificationDocument: documentUpload } = require("../middleware/upload.middleware");

router.get("/", getTutors);
router.get("/me", protect, restrictTo("tutor"), getMyProfile);
router.get("/:id", getTutor);
router.post("/", protect, createTutorProfile);
router.patch("/me", protect, restrictTo("tutor"), updateTutorProfile);
router.delete("/", protect, restrictTo("tutor"), deleteTutor);
router.post("/me/documents", protect, restrictTo("tutor"), documentUpload, uploadVerificationDocument);
router.delete("/me/documents/:docId", protect, restrictTo("tutor"), deleteVerificationDocument);

module.exports = router;
