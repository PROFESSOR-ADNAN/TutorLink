const router = require("express").Router();
const {
  createPaymentIntent,
  stripeWebhook,
} = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

// Stripe webhook must receive RAW body — handled in app.js before json() middleware
router.post("/webhook", stripeWebhook);

router.post("/create-payment-intent/:bookingId", protect, createPaymentIntent);

module.exports = router;
