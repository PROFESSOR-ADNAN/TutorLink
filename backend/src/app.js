// dotenv is loaded in server.js before this module is required
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const tutorRoutes = require("./routes/tutor.routes");
const bookingRoutes = require("./routes/booking.routes");
const reviewRoutes = require("./routes/review.routes");
const chatRoutes = require("./routes/chat.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminRoutes = require("./routes/admin.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

// ──────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ──────────────────────────────────────────────────────────

// Helmet sets secure HTTP headers (prevents XSS, clicking, etc.)
app.use(helmet());

// CORS — only allow our React frontend to talk to this API
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // allow cookies to be sent cross-origin
  }),
);

// Rate limiting — prevents brute-force and DoS attacks
// Allows 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Stricter limit for auth endpoints specifically
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: "Too many auth attempts, please try again after 1 hour",
});
app.use("/api/auth", authLimiter);

// ──────────────────────────────────────────────────────────
// PARSING & LOGGING
// ──────────────────────────────────────────────────────────

// Parse raw body FIRST for Stripe webhooks (must be before express.json)
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

// Parse JSON bodies (limit 10kb prevents payload-size attacks)
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Sanitize against NoSQL injection attacks (e.g., {"$gt": ""} in body)
app.use(mongoSanitize());

// HTTP request logger (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ──────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/tutors", tutorRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

// ──────────────────────────────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
