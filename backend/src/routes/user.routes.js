const router = require('express').Router();
const User = require('../models/User.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');

const {getAll, updateMe, deleteMe} = require("../controllers/user.controller")

// Admin: list all users
router.get('/', protect, restrictTo('admin'), getAll);

// Update current user's profile (name, bio, avatar, etc.)
router.patch('/me', protect, updateMe);

// Deactivate account
router.delete('/me', protect, deleteMe);

module.exports = router;
