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

// ─── Earnings / financial dashboard ─────────────────────────
// Powers the admin "Earnings" tab: total platform commission, total paid
// out to tutors, daily/monthly trend, and a per-tutor breakdown.
exports.getEarnings = catchAsync(async (req, res, next) => {
  const paidMatch = { "payment.status": "paid" };

  const [totals, daily, monthly, byTutor] = await Promise.all([
    // Overall totals
    Booking.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: "$payment.amount" },
          platformFees: { $sum: "$payment.platformFeeAmount" },
          tutorPayouts: { $sum: "$payment.tutorPayoutAmount" },
          paidBookings: { $sum: 1 },
        },
      },
    ]),

    // Daily trend — last 30 days
    Booking.aggregate([
      {
        $match: {
          ...paidMatch,
          "payment.paidAt": { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$payment.paidAt" } },
          grossRevenue: { $sum: "$payment.amount" },
          platformFees: { $sum: "$payment.platformFeeAmount" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Monthly trend — last 12 months
    Booking.aggregate([
      {
        $match: {
          ...paidMatch,
          "payment.paidAt": { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$payment.paidAt" } },
          grossRevenue: { $sum: "$payment.amount" },
          platformFees: { $sum: "$payment.platformFeeAmount" },
          tutorPayouts: { $sum: "$payment.tutorPayoutAmount" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Per-tutor breakdown — "individual gains"
    Booking.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: "$tutor",
          totalPayout: { $sum: "$payment.tutorPayoutAmount" },
          totalPlatformFee: { $sum: "$payment.platformFeeAmount" },
          sessionsCompleted: { $sum: 1 },
        },
      },
      { $sort: { totalPayout: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "tutors",
          localField: "_id",
          foreignField: "_id",
          as: "tutor",
        },
      },
      { $unwind: "$tutor" },
      {
        $lookup: {
          from: "users",
          localField: "tutor.user",
          foreignField: "_id",
          as: "tutorUser",
        },
      },
      { $unwind: "$tutorUser" },
      {
        $project: {
          _id: 0,
          tutorId: "$_id",
          name: "$tutorUser.name",
          avatar: "$tutorUser.avatar",
          totalPayout: 1,
          totalPlatformFee: 1,
          sessionsCompleted: 1,
        },
      },
    ]),
  ]);

  res.status(200).json({
    commissionRate: Number(process.env.PLATFORM_COMMISSION_RATE || 0.18),
    totals: totals[0] || { grossRevenue: 0, platformFees: 0, tutorPayouts: 0, paidBookings: 0 },
    daily,
    monthly,
    byTutor,
  });
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
