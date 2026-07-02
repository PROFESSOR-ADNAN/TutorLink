// Custom error class for operational (expected) errors
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // vs programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 handler — catches unmatched routes
const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

// Global error handler — last middleware in the chain
const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };
  error.statusCode = err.statusCode || 500;

  // Mongoose: invalid ObjectId (e.g. /api/users/not-an-id)
  if (err.name === "CastError") {
    error = new AppError("Resource not found", 404);
  }

  // Mongoose: duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 400);
  }

  // Mongoose: validation errors (required fields, min/max, etc.)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join(". "), 400);
  }

  // JWT errors handled in auth middleware, but just in case
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid token", 401);
  }

  if (process.env.NODE_ENV === "development") {
    // In development, send full error details
    return res.status(error.statusCode).json({
      message: error.message,
      stack: err.stack,
      error: err,
    });
  }

  // In production, only send user-friendly messages for operational errors
  if (error.isOperational) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  // Programming error — don't leak details to client
  console.error("PROGRAMMING ERROR 💥", err);
  return res
    .status(500)
    .json({ message: "Something went wrong. Please try again later." });
};

module.exports = { AppError, notFound, errorHandler };
