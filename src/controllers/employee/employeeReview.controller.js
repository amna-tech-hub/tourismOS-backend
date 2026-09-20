// controllers/employee/employeeReview.controller.js
const Review = require("../../models/Review.model");
const Tour = require("../../models/Tour.model");
const Company = require("../../models/Company.model");
const Employee = require("../../models/Employee.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util");

// Helper: Get employee's company
const getEmployeeCompany = async (userId) => {
  const employee = await Employee.findOne({
    user: userId,
    isDeleted: { $ne: true },
  });

  if (!employee) return null;

  return await Company.findOne({
    _id: employee.company,
    isDeleted: false,
  });
};

// ==========================================
// GET REVIEWS FOR MY TOURS
// ==========================================
const getMyTourReviews = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // Get tour IDs created by this employee
    const myTours = await Tour.find({
      company: company._id,
      createdBy: req.user.id,
      isDeleted: false,
    }).select("_id");

    const tourIds = myTours.map((t) => t._id);

    // Filter: Reviews for my tours
    const filter = {
      tour: { $in: tourIds },
      isDeleted: { $ne: true },
    };

    // Optional: Filter by rating
    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating);
    }

    // Optional: Filter by specific tour
    if (req.query.tourId) {
      filter.tour = req.query.tourId;
    }

    // Total count
    const totalDocuments = await Review.countDocuments(filter);

    // Base query
    const baseQuery = Review.find(filter)
      .populate("tour", "title from to coverImage")
      .populate("user", "name email avatar");

    // Apply ApiFeatures
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["comment", "user.name"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const reviews = await features.query;

    // Pagination metadata
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalDocuments / limit);

    return successResponse(res, {
      statusCode: 200,
      message: "Reviews retrieved successfully.",
      data: reviews,
      meta: {
        totalDocuments,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get My Tour Reviews Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET RATING STATISTICS
// ==========================================
const getRatingStats = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // Get tour IDs created by this employee
    const myTours = await Tour.find({
      company: company._id,
      createdBy: req.user.id,
      isDeleted: false,
    }).select("_id");

    const tourIds = myTours.map((t) => t._id);

    // Aggregate rating statistics
    const stats = await Review.aggregate([
      {
        $match: {
          tour: { $in: tourIds },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          fiveStars: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          fourStars: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          threeStars: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          twoStars: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
        },
      },
    ]);

    const ratingStats = stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStar: 0,
    };

    // Format response
    const formattedStats = {
      averageRating: Math.round((ratingStats.averageRating || 0) * 10) / 10,
      totalReviews: ratingStats.totalReviews,
      distribution: {
        5: ratingStats.fiveStars,
        4: ratingStats.fourStars,
        3: ratingStats.threeStars,
        2: ratingStats.twoStars,
        1: ratingStats.oneStar,
      },
      percentages: {
        5: ratingStats.totalReviews
          ? Math.round((ratingStats.fiveStars / ratingStats.totalReviews) * 100)
          : 0,
        4: ratingStats.totalReviews
          ? Math.round((ratingStats.fourStars / ratingStats.totalReviews) * 100)
          : 0,
        3: ratingStats.totalReviews
          ? Math.round((ratingStats.threeStars / ratingStats.totalReviews) * 100)
          : 0,
        2: ratingStats.totalReviews
          ? Math.round((ratingStats.twoStars / ratingStats.totalReviews) * 100)
          : 0,
        1: ratingStats.totalReviews
          ? Math.round((ratingStats.oneStar / ratingStats.totalReviews) * 100)
          : 0,
      },
    };

    return successResponse(res, {
      statusCode: 200,
      message: "Rating statistics retrieved successfully.",
      data: formattedStats,
    });
  } catch (error) {
    console.error("Get Rating Stats Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getMyTourReviews,
  getRatingStats,
};