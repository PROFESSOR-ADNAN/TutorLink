const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // One review per booking
    },
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
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ tutor: 1 });
reviewSchema.index({ student: 1 });

// ─── Static method: recalculate tutor's average rating ────
// Called automatically after a review is saved or deleted
reviewSchema.statics.calcAverageRating = async function (tutorId) {
  const stats = await this.aggregate([
    { $match: { tutor: tutorId } },
    {
      $group: {
        _id: '$tutor',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model('Tutor').findByIdAndUpdate(tutorId, {
      averageRating: stats[0].avgRating,
      totalReviews: stats[0].count,
    });
  } else {
    await mongoose.model('Tutor').findByIdAndUpdate(tutorId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

// Trigger rating recalculation after save and delete
reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.tutor);
});

reviewSchema.post('remove', function () {
  this.constructor.calcAverageRating(this.tutor);
});

module.exports = mongoose.model('Review', reviewSchema);
