const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const { sendEmail } = require("../utils/email");
const { AppError } = require("../middleware/error.middleware");
const catchAsync = require("../utils/catchAsync");

// ─── Helper: create & send JWT ────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true, // Cookie not accessible by JavaScript (prevents XSS token theft)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  res.cookie("token", token, cookieOptions);

  user.password = undefined; // Remove password from output

  res.status(statusCode).json({ token, data: { user } });
};

// ─── Register ─────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Prevent anyone from registering as admin via the API
  const safeRole = role === "admin" ? "student" : role;

  const user = await User.create({ name, email, password, role: safeRole });

  // Send email verification
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  const verifyUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${verifyToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your TutorLink account",
      template: "emailVerification",
      data: { name: user.name, verifyUrl },
    });
  } catch (err) {
    console.error("Failed to send verification email:", err.message); // log, don't throw
  }

  sendTokenResponse(user, 201, res);
});

// ─── Login ────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Invalid email or password", 401));
  }

  if (!user.isActive) {
    return next(
      new AppError("Account has been deactivated. Contact support.", 403),
    );
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// ─── Logout ───────────────────────────────────────────────
exports.logout = (req, res) => {
  res.cookie("token", "", { expires: new Date(0), httpOnly: true });
  res.status(200).json({ message: "Logged out successfully" });
};

// ─── Get current user ─────────────────────────────────────
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ user });
});

// ─── Email Verification ───────────────────────────────────
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("Token is invalid or has expired", 400));

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ message: "Email verified successfully" });
});

// ─── Forgot Password ──────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  // Always return success (prevents user enumeration attacks)
  // ✅ Always return success even if user not found
  if (!user) {
    console.log(`Password reset requested for non-existent email: ${email}`);
    return res.status(200).json({
      status: "success",
      message: "If that email exists, a reset link has been sent.",
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your TutorLink password (valid 10 minutes)",
      template: "passwordReset",
      data: { name: user.name, resetUrl },
    });
  } catch (emailError) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await User.save({ validateBeforeSave: false });

    return next(new AppError("Error sending email. Please try again.", 500));
  }

  res
    .status(200)
    .json({ message: "If that email exists, a reset link has been sent." });
});

// ─── Reset Password ───────────────────────────────────────
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("Token is invalid or has expired", 400));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// ─── Update Password ──────────────────────────────────────
exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError("Current password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});
