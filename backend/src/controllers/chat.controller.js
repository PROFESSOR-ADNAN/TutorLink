const Message = require("../models/Message.model");
const User = require("../models/User.model");
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

  const roomId = Message.getRoomId(req.user._id, receiverId);

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
