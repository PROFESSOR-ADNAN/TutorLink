const Tutor = require("../models/Tutor.model");
const User = require("../models/User.model");
const { AppError } = require("../middleware/error.middleware");
const catchAsync = require("../utils/catchAsync");

// ─── Search/Browse Tutors ─────────────────────────────────
exports.getTutors = catchAsync(async (req, res, next) => {
  const {
    subject,
    minRate,
    maxRate,
    minRating,
    language,
    search,
    sort = "-averageRating",
    page = 1,
    limit = 12,
  } = req.query;

  // Only show tutors that are both approved AND available to the public
  const filter = { isApproved: true, isAvailable: true };

  if (subject) filter.subjects = { $in: [new RegExp(subject, "i")] };
  if (minRate || maxRate) {
    filter.hourlyRate = {};
    if (minRate) filter.hourlyRate.$gte = Number(minRate);
    if (maxRate) filter.hourlyRate.$lte = Number(maxRate);
  }
  if (minRating) filter.averageRating = { $gte: Number(minRating) };
  if (language) filter.languages = { $in: [language] };

  // Free-text search across name, subjects, university, and teaching style —
  // name lives on the User model, so we resolve matching user ids first,
  // then OR them in alongside the tutor-side field matches.
  if (search) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    const matchingUserIds = await User.find({ role: "tutor", name: re }).distinct("_id");
    filter.$or = [
      { subjects: { $in: [re] } },
      { university: re },
      { teachingStyle: re },
      { user: { $in: matchingUserIds } },
    ];
  }

  const skip = (page - 1) * limit;

  const [tutors, total] = await Promise.all([
    Tutor.find(filter)
      .populate("user", "name avatar bio location")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Tutor.countDocuments(filter),
  ]);

  res.status(200).json({
    tutors,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// ─── Get Single Tutor (public) ────────────────────────────
exports.getTutor = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findById(req.params.id).populate(
    "user",
    "name avatar bio location createdAt",
  );

  // Must exist, be approved, and be available to be publicly visible
  if (!tutor || !tutor.isAvailable || !tutor.isApproved)
    return next(new AppError("Tutor not found", 404));

  res.status(200).json({ tutor });
});

// ─── Create Tutor Profile ─────────────────────────────────
exports.createTutorProfile = catchAsync(async (req, res, next) => {
  const existing = await Tutor.findOne({ user: req.user._id });

  if (existing) {
    if (existing.isAvailable) {
      // Active profile already exists — cannot create another
      return next(
        new AppError("You already have an active tutor profile", 400),
      );
    }

    // Deactivated profile exists — reactivate it with the new submitted data
    // instead of creating a new document (unique constraint on user field)
    const reactivated = await Tutor.findByIdAndUpdate(
      existing._id,
      {
        ...req.body,
        isAvailable: true,
        isApproved: false, // Must go through approval again
      },
      { new: true, runValidators: true },
    );

    // Restore tutor role on the user
    await User.findByIdAndUpdate(req.user._id, { role: "tutor" });

    return res.status(200).json({ tutor: reactivated });
  }

  // No profile at all — create a fresh one
  const tutor = await Tutor.create({ ...req.body, user: req.user._id });
  await User.findByIdAndUpdate(req.user._id, { role: "tutor" });

  res.status(201).json({ tutor });
});

// ─── Update Tutor Profile ─────────────────────────────────
exports.updateTutorProfile = catchAsync(async (req, res, next) => {
  // No isAvailable filter here — a deactivated tutor should still
  // be able to update their profile (e.g. before reactivating)
  const tutor = await Tutor.findOne({ user: req.user._id });
  if (!tutor) return next(new AppError("Tutor profile not found", 404));

  // Strip fields that must never be changed via this route
  const {
    isApproved,
    averageRating,
    totalReviews,
    totalSessions,
    user: _user, // prevent user field reassignment
    ...updates
  } = req.body;

  const updated = await Tutor.findByIdAndUpdate(tutor._id, updates, {
    new: true,
    runValidators: true,
  }).populate("user", "name avatar bio");

  res.status(200).json({ tutor: updated });
});

// ─── Get my tutor profile ─────────────────────────────────
exports.getMyProfile = catchAsync(async (req, res, next) => {
  // No isAvailable filter — the tutor should be able to see their
  // own profile even when deactivated
  const tutor = await Tutor.findOne({ user: req.user._id }).populate(
    "user",
    "name email avatar bio location phone",
  );

  if (!tutor)
    return next(new AppError("You do not have a tutor profile yet", 404));

  res.status(200).json({ tutor });
});

// ─── Deactivate (soft delete) tutor profile ───────────────
exports.deleteTutor = catchAsync(async (req, res, next) => {
  const tutor = await Tutor.findOne({ user: req.user._id });

  // Guard: tutor document must exist
  if (!tutor) return next(new AppError("You do not have a tutor profile", 404));

  // Guard: already deactivated — nothing to do
  if (!tutor.isAvailable)
    return next(new AppError("Your tutor profile is already deactivated", 400));

  await Tutor.findByIdAndUpdate(tutor._id, {
    isAvailable: false,
    isApproved: false, // Remove from public search immediately
  });

  // Downgrade the user's role back to student since they're no longer
  // an active tutor — this also removes tutor-only route access
  await User.findByIdAndUpdate(req.user._id, { role: "student" });

  res.status(200).json({ message: "Tutor profile deactivated successfully" });
});
