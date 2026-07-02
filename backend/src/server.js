// Load .env FIRST — before any other require that reads process.env
require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');

// Handle uncaught exceptions BEFORE anything else
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server (for real-time chat)
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 TutorLink API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown on unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});
