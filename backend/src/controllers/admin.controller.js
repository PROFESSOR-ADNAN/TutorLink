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
  const commissionRate = Number(process.env.PLATFORM_COMMISSION_RATE || 0.18);

  // Defensive fallback: platformFeeAmount/tutorPayoutAmount are normally set
  // when the PaymentIntent is created (payment.controller.js). If a booking
  // somehow ended up marked "paid" without going through that — e.g. old
  // data from before the commission split existed, or a booking seeded
  // directly into the DB for testing — those fields would be stuck at 0
  // even though payment.amount is real. Rather than silently showing $0,
  // we recompute the split on the fly from the current commission rate so
  // the dashboard numbers are always meaningful.
  const feeFallback = {
    $let: {
      vars: {
        storedFee: { $ifNull: ["$payment.platformFeeAmount", 0] },
        amount: { $ifNull: ["$payment.amount", 0] },
      },
      in: {
        $cond: [
          { $gt: ["$$storedFee", 0] },
          "$$storedFee",
          { $round: [{ $multiply: ["$$amount", commissionRate] }] },
        ],
      },
    },
  };
  const payoutFallback = {
    $let: {
      vars: {
        storedPayout: { $ifNull: ["$payment.tutorPayoutAmount", 0] },
        amount: { $ifNull: ["$payment.amount", 0] },
        fee: feeFallback,
      },
      in: {
        $cond: [
          { $gt: ["$$storedPayout", 0] },
          "$$storedPayout",
          { $subtract: ["$$amount", "$$fee"] },
        ],
      },
    },
  };

  const [totals, statusBreakdown, daily, monthly, byTutor] = await Promise.all([
    // Overall totals across every paid booking, regardless of whether the
    // session itself has since happened (status: 'completed') or is still
    // upcoming (status: 'confirmed') — payment settles at booking time via
    // Stripe Connect, not at session-completion time.
    Booking.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: "$payment.amount" },
          platformFees: { $sum: feeFallback },
          tutorPayouts: { $sum: payoutFallback },
          paidBookings: { $sum: 1 },
        },
      },
    ]),

    // Full status breakdown — answers "which bookings actually took place
    // vs. got cancelled vs. are still upcoming" in one place.
    Booking.aggregate([
      {
        $group: {
          _id: { status: "$status", paymentStatus: "$payment.status" },
          count: { $sum: 1 },
          amount: { $sum: "$payment.amount" },
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
          platformFees: { $sum: feeFallback },
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
          platformFees: { $sum: feeFallback },
          tutorPayouts: { $sum: payoutFallback },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Per-tutor breakdown — "individual gains". Separately counts sessions
    // that actually took place (status: 'completed') from ones merely paid
    // and still upcoming, so "3 sessions" doesn't quietly include ones that
    // haven't happened yet or were later cancelled-and-refunded (excluded
    // entirely, since those flip to payment.status: 'refunded').
    Booking.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: "$tutor",
          totalPayout: { $sum: payoutFallback },
          totalPlatformFee: { $sum: feeFallback },
          paidSessions: { $sum: 1 },
          completedSessions: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
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
          paidSessions: 1,
          completedSessions: 1,
          payoutsEnabled: "$tutor.payoutsEnabled",
        },
      },
    ]),
  ]);

  // Reshape the {status, paymentStatus} breakdown into something directly
  // usable by the UI: how many bookings are upcoming/paid, completed,
  // cancelled-with-refund, cancelled-without-refund, and still awaiting
  // payment — with dollar amounts attached to each bucket.
  const buckets = {
    confirmed: { count: 0, amount: 0 },      // paid, session hasn't happened yet
    completed: { count: 0, amount: 0 },      // paid, session took place
    cancelledRefunded: { count: 0, amount: 0 },
    cancelledNoRefund: { count: 0, amount: 0 },
    pendingUnpaid: { count: 0, amount: 0 },  // never got past checkout
  };
  for (const row of statusBreakdown) {
    const { status, paymentStatus } = row._id;
    if (status === "confirmed" && paymentStatus === "paid") {
      buckets.confirmed.count += row.count;
      buckets.confirmed.amount += row.amount;
    } else if (status === "completed") {
      buckets.completed.count += row.count;
      buckets.completed.amount += row.amount;
    } else if (status === "cancelled" && paymentStatus === "refunded") {
      buckets.cancelledRefunded.count += row.count;
      buckets.cancelledRefunded.amount += row.amount;
    } else if (status === "cancelled") {
      buckets.cancelledNoRefund.count += row.count;
      buckets.cancelledNoRefund.amount += row.amount;
    } else if (status === "pending" && paymentStatus === "unpaid") {
      buckets.pendingUnpaid.count += row.count;
      buckets.pendingUnpaid.amount += row.amount;
    }
  }

  res.status(200).json({
    commissionRate,
    totals: totals[0] || { grossRevenue: 0, platformFees: 0, tutorPayouts: 0, paidBookings: 0 },
    statusBreakdown: buckets,
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
