const router = require("express").Router();
const {
  getTutors,
  getTutor,
  createTutorProfile,
  updateTutorProfile,
  getMyProfile,
  deleteTutor,
} = require("../controllers/tutor.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.get("/", getTutors);
router.get("/me", protect, restrictTo("tutor"), getMyProfile);
router.get("/:id", getTutor);
router.post("/", protect, createTutorProfile);
router.patch("/me", protect, restrictTo("tutor"), updateTutorProfile);
router.delete("/", protect, restrictTo("tutor"), deleteTutor);

module.exports = router;
