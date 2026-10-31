const User = require("../models/User.model");
const Tutor = require("../models/Tutor.model");
const Booking = require("../models/Booking.model");
const catchAsync = require("../utils/catchAsync");
const { AppError } = require("../middleware/error.middleware");
const { sendEmail } = require("../utils/email");

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
    Tutor.countDocuments({ applicationStatus: "pending" }),
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
      totalRevenue: revenueAgg[0]?.total || 0, // ETB (whole numbers, no cents)
    },
  });
});

// ─── Tutor approval queue ───────────────────────────────────
exports.getPendingTutors = catchAsync(async (req, res, next) => {
  const tutors = await Tutor.find({ applicationStatus: "pending" })
    .populate("user", "name email avatar createdAt")
    .sort("-createdAt");
  res.status(200).json({ tutors });
});

// Tutors already rejected (or previously rejected and not yet resubmitted)
// — kept separate from the main queue so it doesn't get mixed in with
// fresh applications actually awaiting a decision.
exports.getRejectedTutors = catchAsync(async (req, res, next) => {
  const tutors = await Tutor.find({ applicationStatus: "rejected" })
    .populate("user", "name email avatar createdAt")
    .sort("-rejection.rejectedAt");
  res.status(200).json({ tutors });
});

exports.approveTutor = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findById(req.params.id).populate("user", "name email avatar");
  if (!tutor) return next(new AppError("Tutor profile not found", 404));

  const hasId = tutor.verificationDocuments?.some((d) => d.type === "national_id");
  if (!hasId) {
    return next(
      new AppError(
        "This tutor hasn't uploaded a national ID yet — verification documents are required before approval.",
        400,
      ),
    );
  }

  tutor.isApproved = true;
  tutor.applicationStatus = "approved";
  await tutor.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      to: tutor.user.email,
      subject: "You're approved — welcome to TutorLink!",
      template: "tutorApproved",
      data: { name: tutor.user.name },
    });
  } catch (err) {
    console.error("Failed to send tutor approval email:", err.message);
  }

  res.status(200).json({ tutor });
});

// Rejection is a SOFT state, not a delete — the tutor's profile, uploaded
// documents, and payout setup all survive it. They can fix whatever was
// wrong and edit their profile to resubmit (see tutor.controller.js
// updateTutorProfile, which automatically flips a rejected application
// back to "pending" the moment they save an edit).
exports.rejectTutor = catchAsync(async (req, res, next) => {
  const { reason, unmetCriteria } = req.body;
  if (!reason || !reason.trim()) {
    return next(new AppError("Please provide a reason for rejecting this application", 400));
  }

  const tutor = await Tutor.findById(req.params.id).populate("user", "name email");
  if (!tutor) return next(new AppError("Tutor profile not found", 404));

  tutor.isApproved = false;
  tutor.applicationStatus = "rejected";
  tutor.rejection = {
    reason: reason.trim(),
    unmetCriteria: Array.isArray(unmetCriteria) ? unmetCriteria : [],
    rejectedAt: new Date(),
    rejectedBy: req.user._id,
  };
  await tutor.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      to: tutor.user.email,
      subject: "Your TutorLink tutor application needs some changes",
      template: "tutorRejected",
      data: {
        name: tutor.user.name,
        reason: tutor.rejection.reason,
        unmetCriteria: tutor.rejection.unmetCriteria,
      },
    });
  } catch (err) {
    console.error("Failed to send tutor rejection email:", err.message);
  }

  res.status(200).json({ tutor });
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
    // Overall totals across every paid booking. NOTE: tutorPayouts below
    // counts only payouts Chapa has actually confirmed as released — the
    // tutor's share is now held until the session is marked completed
    // (see releaseTutorPayout in payment.controller.js), not settled
    // automatically the moment the student pays.
    Booking.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: "$payment.amount" },
          platformFees: { $sum: feeFallback },
          tutorPayouts: {
            $sum: { $cond: [{ $eq: ["$payment.payoutStatus", "released"] }, payoutFallback, 0] },
          },
          pendingPayouts: {
            $sum: { $cond: [{ $ne: ["$payment.payoutStatus", "released"] }, payoutFallback, 0] },
          },
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
  const {
    status,
    paymentStatus,
    subject,
    studentSearch,
    tutorSearch,
    dateFrom,
    dateTo,
    sort = "-scheduledAt",
    page = 1,
    limit = 25,
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter["payment.status"] = paymentStatus;
  if (subject) filter.subject = new RegExp(subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  if (dateFrom || dateTo) {
    filter.scheduledAt = {};
    if (dateFrom) filter.scheduledAt.$gte = new Date(dateFrom);
    if (dateTo) filter.scheduledAt.$lte = new Date(`${dateTo}T23:59:59`);
  }

  // Name search on student/tutor requires resolving User ids first, since
  // that's where `name` actually lives (not on the Booking document itself).
  if (studentSearch) {
    const re = new RegExp(studentSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const ids = await User.find({ role: "student", name: re }).distinct("_id");
    filter.student = { $in: ids };
  }
  if (tutorSearch) {
    const re = new RegExp(tutorSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const tutorUserIds = await User.find({ role: "tutor", name: re }).distinct("_id");
    const tutorIds = await Tutor.find({ user: { $in: tutorUserIds } }).distinct("_id");
    filter.tutor = { $in: tutorIds };
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("student", "name avatar email")
      .populate({ path: "tutor", populate: { path: "user", select: "name avatar email" } })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    bookings,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});
