const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

// Protect routes — must be logged in
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header (for API clients like mobile apps)
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // 2. Fall back to HTTP-only cookie (for web browser clients)
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authenticated. Please log in." });
    }

    // Verify the token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user and make sure they still exist and are active
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ message: "User no longer exists." });
    }
    if (!currentUser.isActive) {
      return res.status(401).json({ message: "Account has been deactivated." });
    }

    req.user = currentUser; // Attach user to request object
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." });
    }
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token has expired. Please log in again." });
    }
    next(err);
  }
};

// Role-based access control
// Usage: restrictTo('admin', 'tutor') — passes only those roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
