const Message = require("../models/Message.model");
const User = require("../models/User.model");
const { AppError } = require("../middleware/error.middleware");
const catchAsync = require("../utils/catchAsync");

// ─── Get conversation history ─────────────────────────────
exports.getMessages = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const roomId = Message.getRoomId(req.user._id, userId);

  const messages = await Message.find({ roomId })
    .populate("sender", "name avatar")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Mark messages as read
  await Message.updateMany(
    { roomId, receiver: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  res.status(200).json({ messages: messages.reverse() }); // oldest first
});

// ─── Save a message (REST fallback for Socket.IO) ─────────
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { receiverId, content, type = "text", fileUrl } = req.body;

  const receiver = await User.findById(receiverId).select("role");
  if (!receiver) return next(new AppError("Recipient not found", 404));

  const roomId = Message.getRoomId(req.user._id, receiverId);

  // Tutors can't cold-message students — a student has to start the
  // conversation first. This doesn't apply to student->tutor (always
  // allowed, tutors are discoverable/"public"), tutor<->tutor, or anyone
  // messaging/being messaged by an admin.
  if (req.user.role === "tutor" && receiver.role === "student") {
    const studentAlreadyMessaged = await Message.exists({
      roomId,
      sender: receiverId,
    });
    if (!studentAlreadyMessaged) {
      return next(
        new AppError(
          "You can't message a student directly — they'll be able to message you once they view your profile, and you can reply after that.",
          403,
        ),
      );
    }
  }

  const message = await Message.create({
    roomId,
    sender: req.user._id,
    receiver: receiverId,
    content,
    type,
    fileUrl,
  });

  await message.populate("sender", "name avatar");

  res.status(201).json({ message });
});

// ─── Get all conversations for current user ───────────────
exports.getConversations = catchAsync(async (req, res, next) => {
  // Get the last message from each unique conversation
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$roomId",
        lastMessage: { $first: "$$ROOT" },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$receiver", req.user._id] },
                  { $eq: ["$isRead", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { "lastMessage.createdAt": -1 } },
  ]);

  // Populate the other user's info
  const populated = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId =
        conv.lastMessage.sender.toString() === req.user._id.toString()
          ? conv.lastMessage.receiver
          : conv.lastMessage.sender;
      const otherUser =
        await User.findById(otherUserId).select("name avatar role");
      return { ...conv, otherUser };
    }),
  );

  res.status(200).json({ conversations: populated });
});
