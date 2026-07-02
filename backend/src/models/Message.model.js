const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      // Room ID is always the two user IDs sorted and joined: "id1_id2"
      // This ensures the same room regardless of who initiates
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'file', 'image'],
      default: 'text',
    },
    fileUrl: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ receiver: 1, isRead: 1 });

// Helper to generate consistent room IDs
messageSchema.statics.getRoomId = function (userId1, userId2) {
  return [userId1.toString(), userId2.toString()].sort().join('_');
};

module.exports = mongoose.model('Message', messageSchema);
