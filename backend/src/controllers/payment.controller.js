const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const Booking = require("../models/Booking.model");
const Tutor = require("../models/Tutor.model");
const { AppError } = require("../middleware/error.middleware");
const { sendEmail } = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

// Platform commission on every paid booking. Configurable via env so it can
// be tuned without a redeploy of business logic elsewhere. 0.18 = 18%,
// matching the marketplace-standard 15-20% range (Uber/Airbnb/Upwork-style).
const PLATFORM_COMMISSION_RATE = Number(process.env.PLATFORM_COMMISSION_RATE || 0.18);

// ─── Stripe Connect onboarding (tutor payouts) ────────────
// A tutor must complete this before they can be booked/paid — see the
// payoutsEnabled check in createPaymentIntent below.
exports.createConnectOnboardingLink = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findOne({ user: req.user._id });
  if (!tutor) return next(new AppError("Create your tutor profile first", 400));

  // Reuse the existing connected account if one was already started
  let accountId = tutor.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: req.user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { tutorId: tutor._id.toString(), userId: req.user._id.toString() },
    });
    accountId = account.id;
    tutor.stripeAccountId = accountId;
    await tutor.save({ validateBeforeSave: false });
  }

  const frontendUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${frontendUrl}/profile?tab=payouts&refresh=1`,
    return_url: `${frontendUrl}/profile?tab=payouts&onboarded=1`,
    type: "account_onboarding",
  });

  res.status(200).json({ url: accountLink.url });
});

// ─── Check / refresh onboarding status ─────────────────────
// Called when the tutor lands back on /profile after the Stripe-hosted flow,
// since Stripe doesn't push completion to us synchronously — we ask.
exports.getConnectStatus = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findOne({ user: req.user._id });
  if (!tutor) return next(new AppError("Tutor profile not found", 404));

  if (!tutor.stripeAccountId) {
    return res.status(200).json({ connected: false, payoutsEnabled: false });
  }

  const account = await stripe.accounts.retrieve(tutor.stripeAccountId);
  const payoutsEnabled = !!(account.charges_enabled && account.payouts_enabled);

  if (payoutsEnabled !== tutor.payoutsEnabled) {
    tutor.payoutsEnabled = payoutsEnabled;
    await tutor.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    connected: true,
    payoutsEnabled,
    detailsSubmitted: account.details_submitted,
  });
});

// ─── Create Stripe Payment Intent ────────────────────────
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId).populate("tutor");
  if (!booking) return next(new AppError("Booking not found", 404));

  if (booking.student.toString() !== req.user._id.toString()) {
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
  if (!tutor?.stripeAccountId || !tutor.payoutsEnabled) {
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

  // "Destination charge": the student's card is charged the full amount;
  // Stripe automatically keeps `application_fee_amount` in our platform
  // account and transfers the remainder to the tutor's connected account.
  // This is the standard Connect pattern for marketplaces — no manual
  // payouts, no holding tutors' money ourselves.
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: booking.payment.currency,
    application_fee_amount: platformFeeAmount,
    transfer_data: { destination: tutor.stripeAccountId },
    metadata: {
      bookingId: booking._id.toString(),
      studentId: req.user._id.toString(),
      tutorId: tutor._id.toString(),
    },
  });

  booking.payment.stripePaymentIntentId = paymentIntent.id;
  booking.payment.platformFeeAmount = platformFeeAmount;
  booking.payment.tutorPayoutAmount = tutorPayoutAmount;
  await booking.save({ validateBeforeSave: false });

  res.status(200).json({ clientSecret: paymentIntent.client_secret });
});

// ─── Stripe Webhook ───────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ─── Connected account onboarding updates ───────────────
  if (event.type === "account.updated") {
    const account = event.data.object;
    const payoutsEnabled = !!(account.charges_enabled && account.payouts_enabled);
    try {
      await Tutor.findOneAndUpdate(
        { stripeAccountId: account.id },
        { payoutsEnabled },
      );
    } catch (err) {
      console.error("Failed to sync Connect account status:", err.message);
    }
  }

  // ─── Payment succeeded ──────────────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const { bookingId } = pi.metadata;

    try {
      // Generate unique Jitsi meeting link
      const roomId = `tutorlink-${bookingId}-${crypto.randomBytes(4).toString("hex")}`;
      const meetingUrl = `https://meet.jit.si/${roomId}`;

      // Use the fee split Stripe actually applied (from the PaymentIntent
      // itself) rather than trusting whatever we stored when the intent
      // was created — this is the authoritative source and keeps the
      // booking correct even if something upstream ever got out of sync.
      const platformFeeAmount = pi.application_fee_amount ?? 0;
      const tutorPayoutAmount = pi.amount - platformFeeAmount;

      // Confirm the booking, mark as paid, attach meeting link
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        {
          "payment.status": "paid",
          "payment.paidAt": new Date(),
          "payment.stripeChargeId": pi.latest_charge,
          "payment.platformFeeAmount": platformFeeAmount,
          "payment.tutorPayoutAmount": tutorPayoutAmount,
          status: "confirmed",
          meetingUrl,
          meetingId: roomId,
        },
        { new: true },
      )
        .populate("student", "name email")
        .populate({
          path: "tutor",
          populate: { path: "user", select: "name email" },
        });

      if (!booking) {
        console.error(`Booking ${bookingId} not found after payment`);
        return res.json({ received: true });
      }

      const sessionDate = new Date(booking.scheduledAt).toLocaleString(
        "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );

      const amount = (booking.payment.amount / 100).toFixed(2);

      // Email both parties. Independent try/catches so one failing email
      // never blocks or delays the other.
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
            amount,
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
            amount: (booking.payment.tutorPayoutAmount / 100).toFixed(2),
            meetingUrl,
          },
        });
      } catch (err) {
        console.error("Failed to email tutor:", err.message);
      }
    } catch (err) {
      // Log but don't crash — Stripe expects a 200 back regardless.
      // Returning a non-200 makes Stripe retry the webhook repeatedly.
      console.error(
        `Error processing payment webhook for booking ${bookingId}:`,
        err.message,
      );
    }
  }

  // ─── Payment failed ─────────────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    console.error(`Payment failed for booking ${pi.metadata?.bookingId}`);
    // The booking stays as 'pending' — student can retry payment
  }

  // Always return 200 to Stripe — if you return anything else
  // Stripe will keep retrying the webhook for up to 3 days
  res.json({ received: true });
};
