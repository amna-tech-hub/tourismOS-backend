const Review = require('../../models/Review.model');

// Create a new review
exports.createReview = async (req, res) => {
  try {
    const { tourId, rating, comment } = req.body;
    const userId = req.user.id; // From auth middleware

    // Check if user already reviewed this tour
    const existingReview = await Review.findOne({ tour: tourId, user: userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this tour.',
      });
    }

    const review = await Review.create({
      user: userId,
      tour: tourId,
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all reviews for a specific Tour
exports.getTourReviews = async (req, res) => {
  try {
    const { tourId } = req.params;

    const reviews = await Review.find({ tour: tourId })
      .populate('user', 'name profilePicture') // Only pull public user info
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.deleteReview = async (req, res) => {
  try {
    // Read from query if using ?reviewId=... or params if using /:reviewId
    const reviewId = req.query.reviewId || req.params.reviewId;
    const userId = req.user.id;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reviewId',
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    // Authorization check
    if (review.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review',
      });
    }

    await Review.findByIdAndDelete(reviewId);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};