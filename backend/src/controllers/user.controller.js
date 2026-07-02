const User = require("../models/User.model");
const catchAsync = require("../utils/catchAsync");

exports.getAll = catchAsync(async (req, res, next) => {
  const users = await User.find().sort("-createdAt");
  res.status(200).json({ users });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // Disallow password changes here — use /auth/update-password
  const { password, role, isAdmin, ...updates } = req.body;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ user });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  res.cookie("token", "", { expires: new Date(0), httpOnly: true });
  res.status(204).json({ message: "Account deactivated" });
});
