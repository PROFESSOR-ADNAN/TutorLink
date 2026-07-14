const crypto = require("crypto");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Booking = require("../models/Booking.model");
const Tutor = require("../models/Tutor.model");
const { AppError } = require("../middleware/error.middleware");
const { sendEmail } = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

// ─── Booking guard rules (tunable without touching logic below) ──────
// How long an unpaid booking holds a tutor's slot before it's treated as
// expired and the slot frees back up — prevents someone from booking and
// never paying, permanently blocking that time for everyone else.
const PENDING_HOLD_MINUTES = 30;
// A student can have at most this many unpaid pending bookings open at
// once — stops someone from mass-reserving slots "just in case".
const MAX_OPEN_PENDING_BOOKINGS = 3;
// If a student has cancelled this many (or more) bookings in the trailing
// window below, new bookings are blocked until they contact support —
// deters a cancel-and-instantly-rebook pattern that ties up tutors' time.
const MAX_RECENT_CANCELLATIONS = 3;
const CANCELLATION_WINDOW_DAYS = 30;

// Reverses a Stripe destination charge: pulls the tutor's share back from
// their connected account (reverse_transfer) and returns TutorLink's
// commission too (refund_application_fee), so nobody keeps money on a
// session that didn't happen. Safe to call on an unpaid booking (no-op).
async function refundBooking(booking) {
  if (booking.payment.status !== "paid") return;
  await stripe.refunds.create({
    payment_intent: booking.payment.stripePaymentIntentId,
    reverse_transfer: true,
    refund_application_fee: true,
  });
  booking.payment.status = "refunded";
  booking.payment.refundedAt = new Date();
}

// ─── Create a new booking ─────────────────────────────────
exports.createBooking = catchAsync(async (req, res, next) => {
  const { tutorId, subject, scheduledAt, duration, studentNotes } = req.body;

  const tutor = await Tutor.findById(tutorId).populate("user", "name email");
  if (!tutor) return next(new AppError("Tutor not found", 404));
  if (!tutor.isApproved || !tutor.isAvailable) {
    return next(new AppError("This tutor is not currently available", 400));
  }

  // ─── Guard: too many unpaid holds already open ─────────
  // Expired holds (past PENDING_HOLD_MINUTES) don't count against this —
  // they're already treated as abandoned.
  const openPendingCount = await Booking.countDocuments({
    student: req.user._id,
    status: "pending",
    "payment.status": "unpaid",
    expiresAt: { $gt: new Date() },
  });
  if (openPendingCount >= MAX_OPEN_PENDING_BOOKINGS) {
    return next(
      new AppError(
        `You have ${openPendingCount} sessions awaiting payment already. Please pay or let those expire before booking another.`,
        400,
      ),
    );
  }

  // ─── Guard: repeated cancel-and-rebook pattern ──────────
  const windowStart = new Date(Date.now() - CANCELLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recentCancellations = await Booking.countDocuments({
    student: req.user._id,
    status: "cancelled",
    cancelledBy: "student",
    updatedAt: { $gte: windowStart },
  });
  if (recentCancellations >= MAX_RECENT_CANCELLATIONS) {
    return next(
      new AppError(
        "You've cancelled several sessions recently, so new bookings are temporarily on hold. Please contact support to keep booking.",
        400,
      ),
    );
  }

  const newStart = new Date(scheduledAt);
  const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

  // ─── Availability check ───────────────────────────────
  // scheduledAt is treated as a literal UTC instant (see frontend
  // BookingPage.jsx, which builds it the same way) so the day-of-week and
  // time-of-day we check here are exactly what the student saw on screen —
  // no timezone drift between what was displayed and what's enforced.
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = DAY_NAMES[newStart.getUTCDay()];
  const toMinutes = (h, m) => h * 60 + m;
  const startMinutes = toMinutes(newStart.getUTCHours(), newStart.getUTCMinutes());
  const endMinutes = startMinutes + duration;

  const fitsAvailability = (tutor.availability || []).some((slot) => {
    if (slot.day !== dayName) return false;
    const [slotStartH, slotStartM] = slot.startTime.split(":").map(Number);
    const [slotEndH, slotEndM] = slot.endTime.split(":").map(Number);
    return startMinutes >= toMinutes(slotStartH, slotStartM) && endMinutes <= toMinutes(slotEndH, slotEndM);
  });

  if (!fitsAvailability) {
    return next(
      new AppError(
        "This tutor is not available at the selected day/time. Please choose a time within their weekly availability.",
        400,
      ),
    );
  }

  // ─── Overlap check ────────────────────────────────────
  // We need to catch any booking that overlaps with the requested slot.
  // A conflict exists when an existing booking's start is before our end
  // AND an existing booking's end is after our start.
  //
  // Example — existing: 10:00–11:00, new request: 10:30–11:30
  // existing.start (10:00) < newEnd (11:30) ✅
  // existing.end   (11:00) > newStart (10:30) ✅ → conflict
  //
  // An unpaid pending booking past its expiresAt doesn't block anything —
  // it's an abandoned hold, not a real reservation.
  const conflict = await Booking.findOne({
    tutor: tutorId,
    status: { $in: ["pending", "confirmed"] },
    $or: [
      { status: "confirmed" },
      { "payment.status": "paid" },
      { expiresAt: { $gt: new Date() } },
    ],
    scheduledAt: { $lt: newEnd }, // existing start is before new end
    $expr: {
      $gt: [
        { $add: ["$scheduledAt", { $multiply: ["$duration", 60000] }] },
        newStart, // existing end is after new start
      ],
    },
  });

  if (conflict) {
    return next(new AppError("This time slot is already booked", 409));
  }

  // Calculate price in cents for Stripe
  const hours = duration / 60;
  const amount = Math.round(tutor.hourlyRate * hours * 100);

  const booking = await Booking.create({
    student: req.user._id,
    tutor: tutorId,
    subject,
    scheduledAt,
    duration,
    studentNotes,
    payment: { amount, currency: "usd" },
    expiresAt: new Date(Date.now() + PENDING_HOLD_MINUTES * 60 * 1000),
  });

  // Notify tutor that a student has initiated a booking
  // and is about to pay — for awareness only, no action needed from tutor
  try {
    await sendEmail({
      to: tutor.user.email,
      subject: "A student is booking a session with you",
      template: "bookingInitiated",
      data: {
        tutorName: tutor.user.name,
        studentName: req.user.name,
        subject,
        scheduledAt: new Date(scheduledAt).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration,
      },
    });
  } catch (err) {
    console.error("Failed to send verification email:", err.message); // log, don't throw
  }

  res.status(201).json({ booking });
});

// ─── Get a single booking (for the payment/resume page) ───
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate("student", "name avatar email")
    .populate({
      path: "tutor",
      populate: { path: "user", select: "name avatar email" },
    });

  if (!booking) return next(new AppError("Booking not found", 404));

  const isStudent = booking.student._id.toString() === req.user._id.toString();
  const isTutor =
    req.user.role === "tutor" &&
    booking.tutor.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isStudent && !isTutor && !isAdmin) {
    return next(new AppError("Not authorized to view this booking", 403));
  }

  res.status(200).json({ booking });
});

// ─── Get bookings for current user ────────────────────────
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (req.user.role === "student") {
    filter.student = req.user._id;
  } else if (req.user.role === "tutor") {
    const tutorProfile = await Tutor.findOne({ user: req.user._id });
    if (!tutorProfile)
      return next(new AppError("Tutor profile not found", 404));
    filter.tutor = tutorProfile._id;
  }

  if (status) filter.status = status;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("student", "name avatar email")
      .populate({
        path: "tutor",
        populate: { path: "user", select: "name avatar email" },
      })
      .sort("-scheduledAt")
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    bookings,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

// ─── Update booking status ────────────────────────────────
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate("student", "name email")
    .populate({
      path: "tutor",
      populate: { path: "user", select: "name email" },
    });

  if (!booking) return next(new AppError("Booking not found", 404));

  const { status } = req.body;

  const isTutor =
    req.user.role === "tutor" &&
    booking.tutor.user._id.toString() === req.user._id.toString();
  const isStudent = booking.student._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";

  if (!isTutor && !isStudent && !isAdmin) {
    return next(new AppError("Not authorized to update this booking", 403));
  }

  // Confirmed is now handled automatically by the Stripe webhook
  // after payment succeeds — no one can manually set it
  if (status === "confirmed") {
    return next(
      new AppError("Bookings are confirmed automatically after payment", 400),
    );
  }

  if (status === "completed" && !isTutor && !isAdmin) {
    return next(
      new AppError("Only the tutor can mark a booking as completed", 403),
    );
  }

  if (status === "cancelled") {
    if (isTutor && !isAdmin) {
      return next(
        new AppError(
          "Tutors can't cancel a confirmed booking directly. Use 'Request cancellation' instead — an admin will review it.",
          403,
        ),
      );
    }
    // Only allow cancelling pending or confirmed bookings
    if (!["pending", "confirmed"].includes(booking.status)) {
      return next(
        new AppError(
          `Cannot cancel a booking with status: ${booking.status}`,
          400,
        ),
      );
    }
    booking.cancelledBy = isStudent ? "student" : "admin";
    booking.cancelReason = req.body.cancelReason || null;

    // An admin cancelling (whether on their own initiative or approving a
    // tutor's request elsewhere) refunds the student automatically. A
    // student cancelling their own booking does not — that's communicated
    // up front in the cancel confirmation dialog.
    if (isAdmin) {
      try {
        await refundBooking(booking);
      } catch (err) {
        return next(new AppError(`Cancelled, but the refund failed: ${err.message}`, 500));
      }
    }
  }

  booking.status = status;
  if (req.body.tutorNotes) booking.tutorNotes = req.body.tutorNotes;
  if (req.body.sessionSummary) booking.sessionSummary = req.body.sessionSummary;
  await booking.save();

  res.status(200).json({ booking });
});

// ─── Tutor requests a cancellation ─────────────────────────
// A tutor can never cancel directly (see above) — this instead files a
// request an admin has to review, since the student has already paid.
exports.requestCancellation = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate({
    path: "tutor",
    populate: { path: "user", select: "_id" },
  });
  if (!booking) return next(new AppError("Booking not found", 404));

  const isTutor =
    req.user.role === "tutor" &&
    booking.tutor.user._id.toString() === req.user._id.toString();
  if (!isTutor) {
    return next(new AppError("Only this session's tutor can request its cancellation", 403));
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    return next(new AppError(`Cannot request cancellation for a booking with status: ${booking.status}`, 400));
  }
  if (booking.cancellationRequest?.status === "pending") {
    return next(new AppError("A cancellation request for this session is already pending review", 400));
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return next(new AppError("Please explain why you need to cancel this session", 400));
  }

  booking.cancellationRequest = {
    status: "pending",
    reason: reason.trim(),
    requestedAt: new Date(),
  };
  await booking.save({ validateBeforeSave: false });

  res.status(200).json({ booking });
});

// ─── Admin: list pending cancellation requests ─────────────
exports.getCancellationRequests = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ "cancellationRequest.status": "pending" })
    .populate("student", "name avatar email")
    .populate({ path: "tutor", populate: { path: "user", select: "name avatar email" } })
    .sort("-cancellationRequest.requestedAt");

  res.status(200).json({ bookings });
});

// ─── Admin: approve or deny a cancellation request ─────────
exports.resolveCancellationRequest = catchAsync(async (req, res, next) => {
  const { decision, adminNote } = req.body; // decision: 'approve' | 'deny'
  if (!["approve", "deny"].includes(decision)) {
    return next(new AppError("decision must be 'approve' or 'deny'", 400));
  }

  const booking = await Booking.findById(req.params.id)
    .populate("student", "name email")
    .populate({ path: "tutor", populate: { path: "user", select: "name" } });
  if (!booking) return next(new AppError("Booking not found", 404));
  if (booking.cancellationRequest?.status !== "pending") {
    return next(new AppError("This booking has no pending cancellation request", 400));
  }

  booking.cancellationRequest.status = decision === "approve" ? "approved" : "denied";
  booking.cancellationRequest.resolvedAt = new Date();
  booking.cancellationRequest.resolvedBy = req.user._id;
  if (adminNote) booking.cancellationRequest.adminNote = adminNote;

  if (decision === "approve") {
    booking.status = "cancelled";
    booking.cancelledBy = "tutor";
    booking.cancelReason = booking.cancellationRequest.reason;
    try {
      await refundBooking(booking);
    } catch (err) {
      return next(new AppError(`Approved, but the refund failed: ${err.message}`, 500));
    }

    try {
      await sendEmail({
        to: booking.student.email,
        subject: "Your TutorLink session was cancelled",
        template: "sessionCancelled",
        data: {
          name: booking.student.name,
          tutorName: booking.tutor.user.name,
          subject: booking.subject,
          sessionDate: new Date(booking.scheduledAt).toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          refunded: booking.payment.status === "refunded",
        },
      });
    } catch (err) {
      console.error("Failed to email student about cancellation:", err.message);
    }
  }

  await booking.save({ validateBeforeSave: false });
  res.status(200).json({ booking });
});
