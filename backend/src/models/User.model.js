const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['student', 'tutor', 'admin'],
      default: 'student',
    },
    avatar: {
      type: String,
      default: 'https://res.cloudinary.com/tutorlink/image/upload/v1/defaults/avatar.png',
    },
    avatarPublicId: String, // Cloudinary public_id for deletion
    coverImage: String,
    coverImagePublicId: String, // Cloudinary public_id for deletion
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    location: String,
    phone: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Email verification
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Track last login for security
    lastLogin: Date,
    // Personal settings — synced across devices via the API rather than
    // stored only in localStorage, so opening the app on a different
    // device/browser doesn't reset preferences.
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      emailNotifications: {
        bookingUpdates: { type: Boolean, default: true }, // confirmations, cancellations, reminders
        newMessages: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────
// NOTE: email already has an index from unique:true in the field definition
// Adding userSchema.index({ email: 1 }) here would create a duplicate — don't do it
userSchema.index({ role: 1 });

// ─── Password hashing ─────────────────────────────────────
// This runs automatically before every save — so you never
// need to manually hash passwords in your controllers
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Methods ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Store hashed version in DB (never store plain tokens)
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken; // Return plain token to send via email
};

userSchema.methods.createEmailVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verifyToken;
};

module.exports = mongoose.model('User', userSchema);
