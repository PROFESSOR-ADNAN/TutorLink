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
  if (require.main === module) {
    process.exit(1);
  }
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

if (!process.env.CHAPA_SECRET_KEY) {
  console.warn(
    '⚠️  CHAPA_SECRET_KEY is not set — payments will fail until it is added to backend/.env.'
  );
}

// Only listen and initialize Socket.IO if executed directly (e.g. `node src/server.js` or `npm run dev`)
// In serverless environments like Vercel, the app is imported and wrapped by Vercel's serverless handler.
if (require.main === module) {
  // Connect to MongoDB
  connectDB().catch((err) => {
    console.error('Initial DB connection error:', err.message);
  });

  // Attach Socket.IO to the HTTP server (for real-time chat)
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 TutorLink API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Graceful shutdown on unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => process.exit(1));
  });
}

module.exports = app;
