const User = require("../models/User.model");
const Tutor = require("../models/Tutor.model");
const Booking = require("../models/Booking.model");
const catchAsync = require("../utils/catchAsync");
const { AppError } = require("../middleware/error.middleware");

// ─── Platform-wide stats ───────────────────────────────────
exports.getStats = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalStudents,
    totalTutors,
    activeUsers,
    pendingApprovals,
    totalBookings,
    completedSessions,
    cancelledBookings,
    revenueAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "tutor" }),
    User.countDocuments({ isActive: true }),
    Tutor.countDocuments({ isApproved: false }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "completed" }),
    Booking.countDocuments({ status: "cancelled" }),
    Booking.aggregate([
      { $match: { "payment.status": "paid" } },
      { $group: { _id: null, total: { $sum: "$payment.amount" } } },
    ]),
  ]);

  res.status(200).json({
    stats: {
      totalUsers,
      totalStudents,
      totalTutors,
      activeUsers,
      pendingApprovals,
      totalBookings,
      completedSessions,
      cancelledBookings,
      totalRevenue: revenueAgg[0]?.total || 0, // cents
    },
  });
});

// ─── Tutor approval queue ───────────────────────────────────
exports.getPendingTutors = catchAsync(async (req, res, next) => {
  const tutors = await Tutor.find({ isApproved: false })
    .populate("user", "name email avatar createdAt")
    .sort("-createdAt");
  res.status(200).json({ tutors });
});

exports.approveTutor = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true },
  ).populate("user", "name email avatar");
  if (!tutor) return next(new AppError("Tutor profile not found", 404));
  res.status(200).json({ tutor });
});

// Rejecting deletes the application outright — there's no "rejected" state
// in the model, so the person can simply submit a fresh application later
// from their Profile page if they choose to.
exports.rejectTutor = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findByIdAndDelete(req.params.id);
  if (!tutor) return next(new AppError("Tutor profile not found", 404));
  res.status(200).json({ message: "Tutor application rejected" });
});

// ─── User management ────────────────────────────────────────
exports.getUsers = catchAsync(async (req, res, next) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { email: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    users,
    pagination: { page: Number(page), limit: Number(limit), total },
  });
});

exports.setUserActive = catchAsync(async (req, res, next) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return next(new AppError("isActive must be true or false", 400));
  }
  if (req.params.id === req.user._id.toString()) {
    return next(new AppError("You can't deactivate your own account", 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true },
  );
  if (!user) return next(new AppError("User not found", 404));
  res.status(200).json({ user });
});

// ─── Recent bookings (platform-wide, read-only) ─────────────
exports.getRecentBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find()
    .populate("student", "name avatar")
    .populate({ path: "tutor", populate: { path: "user", select: "name avatar" } })
    .sort("-createdAt")
    .limit(50);
  res.status(200).json({ bookings });
});
