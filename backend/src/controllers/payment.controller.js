const crypto = require("crypto");
const chapa = require("../config/chapa");
const Booking = require("../models/Booking.model");
const Tutor = require("../models/Tutor.model");
const { AppError } = require("../middleware/error.middleware");
const { sendEmail } = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

// Platform commission on every paid booking. Configurable via env so it can
// be tuned without a redeploy of business logic elsewhere. 0.18 = 18%,
// matching the marketplace-standard 15-20% range (Uber/Airbnb/Upwork-style).
const PLATFORM_COMMISSION_RATE = Number(
  process.env.PLATFORM_COMMISSION_RATE || 0.18,
);

// Chapa needs first_name/last_name separately; our User model only has a
// single `name` field, so this is a pragmatic split, not a real name parser.
function splitName(fullName = "") {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return {
    first_name: first || "Customer",
    last_name: rest.join(" ") || "Student",
  };
}

// ─── Bank list (for the tutor payout-setup form) ───────────
// Chapa has no hosted onboarding — the tutor picks their bank from this
// list and gives us their account number directly.
exports.getBanks = catchAsync(async (req, res, next) => {
  const { data } = await chapa.get("/banks");
  res.status(200).json({ banks: data.data });
});

// ─── Register a tutor's payout account (Chapa subaccount) ──
// Replaces Stripe Connect onboarding. There's no redirect flow: the tutor
// submits their real bank details directly to us, and we register them
// with Chapa as a "subaccount", which is what lets Chapa automatically
// split each future payment between our platform and this tutor.
exports.registerPayoutAccount = catchAsync(async (req, res, next) => {
  const { bankCode, bankName, accountNumber, accountName } = req.body;
  if (!bankCode || !accountNumber || !accountName) {
    return next(
      new AppError(
        "Bank, account number, and account name are all required",
        400,
      ),
    );
  }

  const tutor = await Tutor.findOne({ user: req.user._id }).populate(
    "user",
    "name",
  );
  if (!tutor) return next(new AppError("Create your tutor profile first", 400));

  // split_value is the SUBACCOUNT's (tutor's) share — Chapa keeps its own
  // processing fee off the top, then splits what's left between the
  // subaccount (this value) and the platform (the remainder). So the
  // tutor's split is 1 - our commission rate.
  const { data } = await chapa.post("/subaccount", {
    business_name: tutor.user.name,
    account_name: accountName,
    bank_code: bankCode,
    account_number: accountNumber,
    split_type: "percentage",
    split_value: Number((1 - PLATFORM_COMMISSION_RATE).toFixed(4)),
  });

  tutor.chapaSubaccountId = data.data.subaccount_id || data.data.id;
  tutor.payoutAccount = { bankCode, bankName, accountNumber, accountName };
  tutor.payoutsEnabled = true;
  await tutor.save({ validateBeforeSave: false });

  res.status(200).json({ tutor });
});

// ─── Initialize a Chapa transaction ────────────────────────
// Replaces Stripe's createPaymentIntent. Chapa's flow is a redirect, not
// an embedded card form: this returns a checkout_url the frontend sends
// the student to. Safe to call again on a still-unpaid booking (e.g. the
// student closed the tab last time) — generates a fresh tx_ref each time.
exports.initializePayment = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate("tutor")
    .populate("student", "name email");
  if (!booking) return next(new AppError("Booking not found", 404));

  if (booking.student._id.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized", 403));
  }
  if (booking.payment.status === "paid") {
    return next(new AppError("This booking is already paid", 400));
  }
  if (booking.status === "cancelled") {
    return next(new AppError("This booking has been cancelled", 400));
  }
  if (new Date(booking.scheduledAt) < new Date()) {
    return next(
      new AppError(
        "This session's scheduled time has passed. Please book a new time.",
        400,
      ),
    );
  }

  const tutor = booking.tutor;
  if (!tutor?.chapaSubaccountId || !tutor.payoutsEnabled) {
    return next(
      new AppError(
        "This tutor hasn't finished setting up payouts yet, so they can't be paid right now. Please try again later or choose another tutor.",
        400,
      ),
    );
  }

  const amount = booking.payment.amount;
  const platformFeeAmount = Math.round(amount * PLATFORM_COMMISSION_RATE);
  const tutorPayoutAmount = amount - platformFeeAmount;

  const txRef = `tutorlink-${booking._id}-${crypto.randomBytes(4).toString("hex")}`;
  const { first_name, last_name } = splitName(booking.student.name);
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
  const frontendUrl = process.env.CLIENT_URL || "http://localhost:3000";

  const { data } = await chapa.post("/transaction/initialize", {
    amount,
    currency: "ETB",
    email: booking.student.email,
    first_name,
    last_name,
    tx_ref: txRef,
    callback_url: `${backendUrl}/api/v1/payments/webhook`,
    return_url: `${frontendUrl}/pay/${booking._id}?status=return`,
    customization: {
      title: "TutorLink",
      description: `${booking.subject} session`,
    },
    // Splits this payment automatically between us and the tutor's
    // subaccount — see registerPayoutAccount for how split_value is set.
    subaccounts: { id: tutor.chapaSubaccountId },
  });

  booking.payment.txRef = txRef;
  booking.payment.platformFeeAmount = platformFeeAmount;
  booking.payment.tutorPayoutAmount = tutorPayoutAmount;
  await booking.save({ validateBeforeSave: false });

  res.status(200).json({ checkoutUrl: data.data.checkout_url });
});

// ─── Confirm a booking once payment is verified ────────────
// Shared by both the webhook and the manual re-check fallback below, so
// the "mark paid, generate meeting link, email both parties" logic only
// lives in one place.
async function confirmPaidBooking(booking, chapaRef) {
  if (booking.payment.status === "paid") return booking; // already processed

  const roomId = `tutorlink-${booking._id}-${crypto.randomBytes(4).toString("hex")}`;
  const meetingUrl = `https://meet.jit.si/${roomId}`;

  booking.payment.status = "paid";
  booking.payment.paidAt = new Date();
  booking.payment.chapaRef = chapaRef;
  booking.status = "confirmed";
  booking.meetingUrl = meetingUrl;
  booking.meetingId = roomId;
  await booking.save({ validateBeforeSave: false });

  await booking.populate("student", "name email");
  await booking.populate({
    path: "tutor",
    populate: { path: "user", select: "name email" },
  });

  const sessionDate = new Date(booking.scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    await sendEmail({
      to: booking.student.email,
      subject: "Your TutorLink session is confirmed ✅",
      template: "sessionConfirmed",
      data: {
        name: booking.student.name,
        otherPersonName: booking.tutor.user.name,
        role: "student",
        subject: booking.subject,
        sessionDate,
        duration: booking.duration,
        amount: `${booking.payment.amount} ETB`,
        meetingUrl,
      },
    });
  } catch (err) {
    console.error("Failed to email student:", err.message);
  }

  try {
    await sendEmail({
      to: booking.tutor.user.email,
      subject: "New paid session booked ✅",
      template: "sessionConfirmed",
      data: {
        name: booking.tutor.user.name,
        otherPersonName: booking.student.name,
        role: "tutor",
        subject: booking.subject,
        sessionDate,
        duration: booking.duration,
        amount: `${booking.payment.tutorPayoutAmount} ETB`,
        meetingUrl,
      },
    });
  } catch (err) {
    console.error("Failed to email tutor:", err.message);
  }

  return booking;
}

// ─── Chapa webhook ──────────────────────────────────────────
// Chapa signs the JSON body itself (not the raw bytes the way Stripe
// does) with a secret YOU choose and register in the Chapa dashboard's
// webhook settings — CHAPA_WEBHOOK_SECRET here must match that value
// exactly. This follows Chapa's own documented verification example.
exports.chapaWebhook = catchAsync(async (req, res) => {
  const signature =
    req.headers["x-chapa-signature"] || req.headers["chapa-signature"];
  const expected = crypto
    .createHmac("sha256", process.env.CHAPA_WEBHOOK_SECRET || "")
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (!signature || signature !== expected) {
    console.error("Chapa webhook signature verification failed");
    return res.status(401).json({ received: false });
  }

  const txRef = req.body.tx_ref;
  if (!txRef) return res.status(200).json({ received: true });

  try {
    // Don't trust the webhook payload's status field alone — independently
    // re-verify with Chapa directly, per Chapa's own recommended practice.
    const { data } = await chapa.get(`/transaction/verify/${txRef}`);
    if (data?.data?.status !== "success") {
      return res.status(200).json({ received: true }); // not a successful payment, nothing to do
    }

    const booking = await Booking.findOne({ "payment.txRef": txRef });
    if (!booking) {
      console.error(`Webhook received for unknown tx_ref: ${txRef}`);
      return res.status(200).json({ received: true });
    }

    await confirmPaidBooking(booking, data.data.ref_id);
  } catch (err) {
    // Log but still return 200 — Chapa (like Stripe) will retry on
    // non-2xx, and we don't want a transient error here to spam retries
    // for something that will just fail the same way again.
    console.error(`Error processing Chapa webhook for ${txRef}:`, err.message);
  }

  res.status(200).json({ received: true });
});

// ─── Manual verification fallback ──────────────────────────
// Chapa's redirect brings the student back to /pay/:bookingId?status=return
// before the webhook necessarily arrives. The frontend calls this once on
// that return to check "did it actually go through?" without just waiting
// and hoping — same underlying verify call the webhook uses.
exports.verifyPayment = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return next(new AppError("Booking not found", 404));
  if (booking.student.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized", 403));
  }

  if (booking.payment.status === "paid") {
    return res.status(200).json({ status: "paid", booking });
  }
  if (!booking.payment.txRef) {
    return res.status(200).json({ status: "unpaid", booking });
  }

  const { data } = await chapa.get(
    `/transaction/verify/${booking.payment.txRef}`,
  );
  if (data?.data?.status === "success") {
    const confirmed = await confirmPaidBooking(booking, data.data.ref_id);
    return res.status(200).json({ status: "paid", booking: confirmed });
  }

  res.status(200).json({ status: "unpaid", booking });
});
