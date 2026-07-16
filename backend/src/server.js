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

// Restricted keys (rk_...) need every Connect permission this app touches
// (accounts:write, account links, reading account status) explicitly
// enabled in the Stripe dashboard, or Connect calls fail with a permissions
// error one endpoint at a time. The full secret key (sk_...) already has
// every permission, which is far simpler for local development — this is
// just a heads-up printed once at boot, not an enforced restriction.
if (process.env.STRIPE_SECRET_KEY?.startsWith('rk_')) {
  console.warn(
    '⚠️  STRIPE_SECRET_KEY is a restricted key (rk_...). Stripe Connect ' +
    '(tutor payouts) needs Account Write + Account Read permissions enabled ' +
    'on it, or onboarding/status calls will fail with a permissions error. ' +
    'For local development, using the full secret key (sk_test_...) avoids ' +
    'this entirely — see https://dashboard.stripe.com/test/apikeys.'
  );
}

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
