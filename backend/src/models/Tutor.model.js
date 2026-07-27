const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  startTime: { type: String, required: true }, // e.g. "09:00"
  endTime: { type: String, required: true },   // e.g. "17:00"
});

const tutorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One tutor profile per user
    },
    subjects: {
      type: [String],
      required: [true, 'At least one subject is required'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one subject is required',
      },
    },
    educationLevel: {
      type: String,
      enum: ['High School', "Bachelor's", "Master's", 'PhD', 'Other'],
      required: true,
    },
    university: String,
    experience: {
      type: Number, // Years of experience
      min: 0,
      max: 50,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [1, 'Rate must be at least $1'],
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    teachingStyle: {
      type: String,
      maxlength: 500,
    },
    availability: [availabilitySlotSchema],
    // Computed from reviews — updated when a review is saved
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: false, // Admin must approve new tutors
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    introVideo: String, // Cloudinary URL
    certificates: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // ─── Chapa payouts (split payments via subaccount) ──────
    // Unlike Stripe Connect, Chapa has no hosted onboarding flow — the
    // tutor gives us their real bank account details directly, and we
    // register them as a Chapa "subaccount" via the API. Chapa then splits
    // each payment automatically at settlement time between our platform
    // and this subaccount, based on chapaSplitType/chapaSplitValue.
    chapaSubaccountId: String,
    payoutAccount: {
      bankCode: Number,     // Chapa's numeric bank ID, from GET /v1/banks
      bankName: String,     // display only, e.g. "Commercial Bank of Ethiopia"
      accountNumber: String,
      accountName: String,  // must match the name on the bank account
    },
    payoutsEnabled: {
      type: Boolean,
      default: false, // flipped true once the Chapa subaccount is created
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes for search performance ───────────────────────
tutorSchema.index({ subjects: 1 });
tutorSchema.index({ averageRating: -1 });
tutorSchema.index({ hourlyRate: 1 });
tutorSchema.index({ isApproved: 1, isAvailable: 1 });

// Full-text search index on subjects and teaching style
tutorSchema.index({ subjects: 'text', teachingStyle: 'text' });

module.exports = mongoose.model('Tutor', tutorSchema);
