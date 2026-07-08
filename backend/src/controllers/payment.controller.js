const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const Booking = require("../models/Booking.model");
const { AppError } = require("../middleware/error.middleware");
const { sendEmail } = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

// ─── Create Stripe Payment Intent ────────────────────────
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return next(new AppError("Booking not found", 404));

  if (booking.student.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized", 403));
  }

  if (booking.payment.status === "paid") {
    return next(new AppError("This booking is already paid", 400));
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.payment.amount,
    currency: booking.payment.currency,
    metadata: {
      bookingId: booking._id.toString(),
      studentId: req.user._id.toString(),
    },
  });

  booking.payment.stripePaymentIntentId = paymentIntent.id;
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

    console.log("event", event);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ─── Payment succeeded ──────────────────────────────────
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const { bookingId } = pi.metadata;

    try {
      // Generate unique Jitsi meeting link
      const roomId = `tutorlink-${bookingId}-${crypto.randomBytes(4).toString("hex")}`;
      const meetingUrl = `https://meet.jit.si/${roomId}`;

      console.log(roomId, meetingUrl);

      // Confirm the booking, mark as paid, attach meeting link
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        {
          "payment.status": "paid",
          "payment.paidAt": new Date(),
          "payment.stripeChargeId": pi.latest_charge,
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

      console.log(booking);

      if (!booking) {
        console.error(`❌ Booking ${bookingId} not found after payment`);
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

      // Email the student
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
        console.error("Failed to send verification email:", err.message); // log, don't throw
      }

      // Add delay before sending second email
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second delay

      // Email the tutor
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
            amount,
            meetingUrl,
          },
        });
      } catch (err) {
        console.error("Failed to send verification email:", err.message); // log, don't throw
      }

      console.log(
        `✅ Booking ${bookingId} confirmed — emails sent to both parties`,
      );
    } catch (err) {
      // Log but don't crash — Stripe expects a 200 back regardless
      // If we return a non-200, Stripe will retry the webhook repeatedly
      console.error(
        `❌ Error processing payment webhook for booking ${bookingId}:`,
        err,
      );
    }
  }

  // ─── Payment failed ─────────────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const { bookingId } = pi.metadata;
    console.error(`❌ Payment failed for booking ${bookingId}`);
    // The booking stays as 'pending' — student can retry payment
  }

  // Always return 200 to Stripe — if you return anything else
  // Stripe will keep retrying the webhook for up to 3 days
  res.json({ received: true });
};
