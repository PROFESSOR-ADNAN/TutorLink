const router = require("express").Router();
const {
  createBooking,
  getBooking,
  getMyBookings,
  updateBookingStatus,
  requestCancellation,
} = require("../controllers/booking.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.use(protect); // All booking routes require authentication

router.get("/", getMyBookings);
router.post("/", restrictTo("student"), createBooking);
router.get("/:id", getBooking);
router.patch("/:id/status", updateBookingStatus);
router.post("/:id/request-cancellation", restrictTo("tutor"), requestCancellation);

module.exports = router;
