const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const {
  createBooking,
  getBooking,
  getMyBookings,
  updateBookingStatus,
  requestCancellation,
} = require("../controllers/booking.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Caps how many booking *creation attempts* one person can make in a short
// window — protects tutors' calendars and Stripe from being hammered by a
// script or an accidental double-submit loop. This is about request
// volume, not a judgment on the person's history — legitimate rebooking
// after a genuine cancellation is never penalized (see the removed
// cancellation-history check that used to live here).
const createBookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { message: "Too many booking attempts in a short time. Please wait a few minutes and try again." },
});

router.use(protect); // All booking routes require authentication

router.get("/", getMyBookings);
router.post("/", restrictTo("student"), createBookingLimiter, createBooking);
router.get("/:id", getBooking);
router.patch("/:id/status", updateBookingStatus);
// Either the student or the tutor on a paid booking can request its
// cancellation — the controller checks which one the caller actually is.
router.post("/:id/request-cancellation", requestCancellation);

module.exports = router;
