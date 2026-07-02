const router = require('express').Router();
const Review = require('../models/Review.model');
const Booking = require('../models/Booking.model');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/error.middleware');

const {getReview, createReview} = require("../controllers/review.controller")

// Get reviews for a tutor
router.get('/tutor/:tutorId', getReview);

// Create a review (only students who completed a session)
router.post('/', protect, restrictTo('student'), createReview);

module.exports = router;
