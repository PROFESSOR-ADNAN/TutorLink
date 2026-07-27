const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tutor',
      required: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Session date/time is required'],
    },
    duration: {
      type: Number, // Duration in minutes
      required: true,
      enum: [30, 60, 90, 120],
      default: 60,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
    },
    // Payment info — linked to Chapa
    payment: {
      // Chapa amounts are plain whole numbers (Birr), not cents — there's
      // no sub-unit the way Stripe uses cents. Do NOT multiply/divide by
      // 100 anywhere this field is read or written.
      amount: { type: Number, required: true }, // total charged to student, in ETB
      currency: { type: String, default: 'ETB' },
      txRef: String,        // our generated reference, sent to Chapa at checkout
      chapaRef: String,     // Chapa's own reference (ref_id) for this transaction
      refundRefId: String,  // Chapa's ref_id for a refund on this transaction, if any
      status: {
        type: String,
        enum: ['unpaid', 'paid', 'refunded'],
        default: 'unpaid',
      },
      // Commission split — set when the transaction is initialized (so we
      // know the intended breakdown even before it's paid), confirmed again
      // once the webhook/verify call reports success. The actual money
      // split happens on Chapa's side automatically via the tutor's
      // subaccount `split_value` — these fields are our own bookkeeping
      // record of what that split represents, for reporting.
      platformFeeAmount: { type: Number, default: 0 }, // ETB kept by TutorLink
      tutorPayoutAmount: { type: Number, default: 0 }, // ETB settled to the tutor's subaccount
      paidAt: Date,
      refundedAt: Date,
    },
    // Video session link (generated when confirmed)
    meetingUrl: String,
    meetingId: String,
    // Notes between student and tutor
    studentNotes: { type: String, maxlength: 1000 },
    tutorNotes: { type: String, maxlength: 1000 },
    // After session
    sessionSummary: { type: String, maxlength: 2000 },
    cancelledBy: {
      type: String,
      enum: ['student', 'tutor', 'admin'],
    },
    cancelReason: String,
    // A cancellation on an already-paid booking always goes through admin
    // review (whether filed by the student or the tutor) rather than being
    // self-service, since real money has to be reversed. Unpaid bookings
    // don't need this — either party can just cancel directly (see
    // updateBookingStatus in booking.controller.js).
    cancellationRequest: {
      status: {
        type: String,
        enum: ['none', 'pending', 'approved', 'denied'],
        default: 'none',
      },
      requestedBy: { type: String, enum: ['student', 'tutor'] },
      reason: { type: String, maxlength: 1000 },
      requestedAt: Date,
      resolvedAt: Date,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      adminNote: { type: String, maxlength: 1000 },
    },
    // Unpaid pending bookings hold the tutor's slot — without a limit, a
    // student could block a time forever without ever paying. Once past
    // this time, the slot is treated as free again (see the conflict check
    // and the per-student pending-bookings guard in createBooking).
    expiresAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────
bookingSchema.index({ student: 1, status: 1 });
bookingSchema.index({ tutor: 1, status: 1 });
bookingSchema.index({ scheduledAt: 1 });

// Virtual: calculate end time
bookingSchema.virtual('endsAt').get(function () {
  if (!this.scheduledAt) return null;
  return new Date(this.scheduledAt.getTime() + this.duration * 60 * 1000);
});

// ─── Post-save hook: increment tutor session count ────────
bookingSchema.post('save', async function () {
  if (this.status === 'completed' && this.isModified('status')) {
    await mongoose.model('Tutor').findOneAndUpdate(
      { user: this.tutor },
      { $inc: { totalSessions: 1 } }
    );
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
