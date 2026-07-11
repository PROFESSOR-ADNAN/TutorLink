const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth.middleware");
const {
  getStats,
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getUsers,
  setUserActive,
  getRecentBookings,
} = require("../controllers/admin.controller");

// Every route below requires a logged-in admin — same session-cookie auth
// as the rest of the app, just restricted to the "admin" role. There's no
// separate admin login system; an account becomes an admin only by having
// its `role` set to "admin" directly in the database, since that's not
// something that should ever be exposed through public signup.
router.use(protect, restrictTo("admin"));

router.get("/stats", getStats);

router.get("/tutors/pending", getPendingTutors);
router.patch("/tutors/:id/approve", approveTutor);
router.delete("/tutors/:id", rejectTutor);

router.get("/users", getUsers);
router.patch("/users/:id/status", setUserActive);

router.get("/bookings", getRecentBookings);

module.exports = router;
