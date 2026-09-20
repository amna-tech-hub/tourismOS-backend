// controllers/employee/employeeDashboard.controller.js
const Tour = require("../../models/Tour.model");
const Booking = require("../../models/Booking.model");
const Review = require("../../models/Review.model");
const Company = require("../../models/Company.model");
const Employee = require("../../models/Employee.model");
const { successResponse, errorResponse } = require("../../utils/response.util");

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

const getDashboardStats = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // Base filter: Employee's own tours
    const tourFilter = {
      company: company._id,
      createdBy: req.user.id,
      isDeleted: false,
    };

    // Get all tour IDs created by this employee
    const myTours = await Tour.find(tourFilter).select("_id");
    const tourIds = myTours.map((t) => t._id);

    const totalTours = await Tour.countDocuments(tourFilter);

    // 2. TOTAL BOOKINGS (for my tours)
    const totalBookings = await Booking.countDocuments({
      tour: { $in: tourIds },
      isDeleted: { $ne: true },
    });

    // 3. AVERAGE RATING (for my tours)
    const ratingStats = await Review.aggregate([
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
        },
      },
    ]);

    const averageRating = ratingStats[0]?.averageRating || 0;
    const totalReviews = ratingStats[0]?.totalReviews || 0;

    // ==========================================
    // 4. RECENT BOOKINGS (last 5)
    // ==========================================
    const recentBookings = await Booking.find({
      tour: { $in: tourIds },
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("tour", "title from to price")
      .populate("user", "name email");

    // ==========================================
    // 5. RECENT REVIEWS (last 5)
    // ==========================================
    const recentReviews = await Review.find({
      tour: { $in: tourIds },
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("tour", "title")
      .populate("user", "name email");

    // RESPONSE
    return successResponse(res, {
      statusCode: 200,
      message: "Dashboard stats retrieved successfully.",
      data: {
        totalTours,
        totalBookings,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        recentBookings,
        recentReviews,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Stats Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getDashboardStats,
};