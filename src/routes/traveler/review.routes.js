const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/traveler/review.controller');
const isAuth = require('../../middleware/authorization.middleware');

// Public route to get reviews for a tour
router.delete('/delete/:reviewId', reviewController.deleteReview);

router.get('/:tourId', reviewController.getTourReviews);

// Protected route to create a review (requires logged-in user)
router.post('/', isAuth, reviewController.createReview);

module.exports = router;