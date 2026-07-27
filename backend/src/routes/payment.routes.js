const router = require("express").Router();
const {
  initializePayment,
  verifyPayment,
  chapaWebhook,
  getBanks,
  registerPayoutAccount,
} = require("../controllers/payment.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Chapa signs the already-parsed JSON body (not the raw bytes, unlike
// Stripe), so this can just be a normal route behind express.json() —
// no special raw-body handling needed in app.js for this one.
router.post("/webhook", chapaWebhook);

router.get("/banks", protect, getBanks);

router.post("/initialize/:bookingId", protect, initializePayment);
router.get("/verify/:bookingId", protect, verifyPayment);

// Tutor payout setup — registering a Chapa subaccount with real bank details
router.post("/payout-account", protect, restrictTo("tutor"), registerPayoutAccount);

module.exports = router;
