const crypto = require("crypto");
const Booking = require("../models/Booking.model");
const Tutor = require("../models/Tutor.model");
const { AppError } = require("../middleware/error.middleware");
const { sendEmail } = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

// ─── Create a new booking ─────────────────────────────────
exports.createBooking = catchAsync(async (req, res, next) => {
  const { tutorId, subject, scheduledAt, duration, studentNotes } = req.body;

  const tutor = await Tutor.findById(tutorId).populate("user", "name email");
  if (!tutor) return next(new AppError("Tutor not found", 404));
  if (!tutor.isApproved || !tutor.isAvailable) {
    return next(new AppError("This tutor is not currently available", 400));
  }

  // ─── Overlap check ────────────────────────────────────
  // We need to catch any booking that overlaps with the requested slot.
  // A conflict exists when an existing booking's start is before our end
  // AND an existing booking's end is after our start.
  //
  // Example — existing: 10:00–11:00, new request: 10:30–11:30
  // existing.start (10:00) < newEnd (11:30) ✅
  // existing.end   (11:00) > newStart (10:30) ✅ → conflict
  const newStart = new Date(scheduledAt);
  const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);

  const conflict = await Booking.findOne({
    tutor: tutorId,
    status: { $in: ["pending", "confirmed"] },
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
    // Only allow cancelling pending or confirmed bookings
    if (!["pending", "confirmed"].includes(booking.status)) {
      return next(
        new AppError(
          `Cannot cancel a booking with status: ${booking.status}`,
          400,
        ),
      );
    }
    booking.cancelledBy = isStudent ? "student" : isTutor ? "tutor" : "admin";
    booking.cancelReason = req.body.cancelReason || null;
  }

  booking.status = status;
  if (req.body.tutorNotes) booking.tutorNotes = req.body.tutorNotes;
  if (req.body.sessionSummary) booking.sessionSummary = req.body.sessionSummary;
  await booking.save();

  res.status(200).json({ booking });
});
