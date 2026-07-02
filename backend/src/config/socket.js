const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Middleware: authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.user._id})`);

    // User joins their personal room (for private messages)
    socket.join(socket.user._id.toString());

    // Handle joining a specific chat room (tutor-student pair)
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
    });

    // Handle sending a message
    socket.on('send_message', (data) => {
      // Emit to everyone in the room EXCEPT the sender
      socket.to(data.roomId).emit('receive_message', {
        ...data,
        sender: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        createdAt: new Date(),
      });
    });

    // Typing indicators
    socket.on('typing', (roomId) => {
      socket.to(roomId).emit('user_typing', { userId: socket.user._id, name: socket.user.name });
    });
    socket.on('stop_typing', (roomId) => {
      socket.to(roomId).emit('user_stop_typing', { userId: socket.user._id });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initSocket, getIO };
