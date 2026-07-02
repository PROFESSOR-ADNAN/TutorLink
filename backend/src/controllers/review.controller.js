const Review = require("../models/Review.model");
const Booking = require("../models/Booking.model");
const { AppError } = require("../middleware/error.middleware");
const catchAsync = require("../utils/catchAsync");

exports.getReview = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({
    tutor: req.params.tutorId,
    isPublic: true,
  })
    .populate("student", "name avatar")
    .sort("-createdAt");
  res.json({ reviews });
});

exports.createReview = catchAsync(async (req, res, next) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError("Booking not found", 404));
  if (booking.student.toString() !== req.user._id.toString()) {
    return next(new AppError("You can only review your own sessions", 403));
  }
  if (booking.status !== "completed") {
    return next(new AppError("You can only review completed sessions", 400));
  }

  const review = await Review.create({
    booking: bookingId,
    student: req.user._id,
    tutor: booking.tutor,
    rating,
    comment,
  });

  await review.populate("student", "name avatar");
  res.status(201).json({ review });
});
