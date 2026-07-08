const router = require("express").Router();
const {
  createBooking,
  getBooking,
  getMyBookings,
  updateBookingStatus,
} = require("../controllers/booking.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.use(protect); // All booking routes require authentication

router.get("/", getMyBookings);
router.post("/", restrictTo("student"), createBooking);
router.get("/:id", getBooking);
router.patch("/:id/status", updateBookingStatus);

module.exports = router;
