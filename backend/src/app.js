// Load environment variables if not already loaded
const path = require("path");
if (!process.env.MONGO_URI) {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

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

// Trust reverse proxy (Vercel Edge Network) so req.ip is correct and rate limiting works accurately
app.set("trust proxy", 1);

// ──────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ──────────────────────────────────────────────────────────

// Helmet sets secure HTTP headers (prevents XSS, clicking, etc.)
app.use(helmet());

// CORS — dynamic origin verification supporting custom domains, Vercel previews & localhost
const explicitOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "https://tutor-link-2yxy.vercel.app",
]
  .filter(Boolean)
  .flatMap((url) => url.split(",").map((s) => s.trim().replace(/\/$/, "")));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");

    // Check if in explicit allowed origins
    if (explicitOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Allow any Vercel deployment preview / branch URL (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // In local development, allow any localhost port
    if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
// DATABASE CONNECTION MIDDLEWARE (SERVERLESS COMPATIBLE)
// ──────────────────────────────────────────────────────────
// Ensures MongoDB connection is established before any database queries execute.
// Prevents Mongoose buffering timeout errors in serverless environments.
app.use(async (req, res, next) => {
  // Skip DB check for health, favicon, socket.io polling, and root routes
  if (
    req.path === "/" ||
    req.path === "/favicon.ico" ||
    req.path.startsWith("/socket.io") ||
    req.path === "/health" ||
    req.path === "/api/health" ||
    req.path === "/api/v1/health"
  ) {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB Connection Middleware Error:", err.message);
    return res.status(503).json({
      status: "error",
      message: "Database connection failed. Check your MONGO_URI and ensure MongoDB Atlas allows access from all IPs (0.0.0.0/0).",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ──────────────────────────────────────────────────────────
// ROUTES
// ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "TutorLink API",
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/v1/health",
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      tutors: "/api/v1/tutors",
      bookings: "/api/v1/bookings",
      reviews: "/api/v1/reviews",
      payments: "/api/v1/payments",
    },
  });
});

const healthHandler = (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

app.get("/api/v1/health", healthHandler);
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

// 1. Primary /api/v1/ prefix
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/tutors", tutorRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

// 2. /api/ prefix
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

// 3. Direct root mounts (/auth, /tutors, etc.)
// Ensures requests succeed even if VITE_API_URL is configured without the /api/v1 suffix
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/bookings", bookingRoutes);
app.use("/tutors", tutorRoutes);
app.use("/reviews", reviewRoutes);
app.use("/chat", chatRoutes);
app.use("/payments", paymentRoutes);
app.use("/admin", adminRoutes);

// ──────────────────────────────────────────────────────────
// ERROR HANDLING
// ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
