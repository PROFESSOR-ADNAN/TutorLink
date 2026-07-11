const router = require("express").Router();
const {
  createPaymentIntent,
  stripeWebhook,
  createConnectOnboardingLink,
  getConnectStatus,
} = require("../controllers/payment.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Stripe webhook must receive RAW body — handled in app.js before json() middleware
router.post("/webhook", stripeWebhook);

router.post("/create-payment-intent/:bookingId", protect, createPaymentIntent);

// Tutor payout setup (Stripe Connect Express onboarding)
router.post("/connect/onboard", protect, restrictTo("tutor"), createConnectOnboardingLink);
router.get("/connect/status", protect, restrictTo("tutor"), getConnectStatus);

module.exports = router;
