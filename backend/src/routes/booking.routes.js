const router = require("express").Router();
const {
  createBooking,
  getMyBookings,
  updateBookingStatus,
} = require("../controllers/booking.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.use(protect); // All booking routes require authentication

router.get("/", getMyBookings);
router.post("/", restrictTo("student"), createBooking);
router.patch("/:id/status", updateBookingStatus);

module.exports = router;
