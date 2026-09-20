// controllers/employee/employeeBooking.controller.js
const Booking = require("../../models/Booking.model");
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
// GET BOOKINGS FOR MY TOURS
// ==========================================
const getMyTourBookings = async (req, res) => {
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

    // Filter: Bookings for my tours
    const filter = {
      tour: { $in: tourIds },
      isDeleted: { $ne: true },
    };

    // Optional: Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Optional: Filter by specific tour
    if (req.query.tourId) {
      filter.tour = req.query.tourId;
    }

    // Total count
    const totalDocuments = await Booking.countDocuments(filter);

    // Base query
    const baseQuery = Booking.find(filter)
      .populate("tour", "title from to price coverImage")
      .populate("user", "name email phone")
      .populate("company", "companyName logo");

    // Apply ApiFeatures
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["bookingId", "user.name", "user.email"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query;

    // Pagination metadata
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalDocuments / limit);

    return successResponse(res, {
      statusCode: 200,
      message: "Bookings retrieved successfully.",
      data: bookings,
      meta: {
        totalDocuments,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get My Tour Bookings Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET BOOKING DETAILS
// ==========================================
const getBookingDetails = async (req, res) => {
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

    const booking = await Booking.findOne({
      _id: req.params.id,
      tour: { $in: tourIds }, // Only bookings for my tours
      isDeleted: { $ne: true },
    })
      .populate("tour", "title from to price duration coverImage itinerary")
      .populate("user", "name email phone gender avatar")
      .populate("company", "companyName logo email phone address")
      .populate("payment", "status amount method transactionId");

    if (!booking) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Booking not found or you don't have permission to view it.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Booking details retrieved successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Get Booking Details Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET BOOKING STATS (by status)
// ==========================================
const getBookingStats = async (req, res) => {
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

    // Aggregate bookings by status
    const stats = await Booking.aggregate([
      {
        $match: {
          tour: { $in: tourIds },
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalPrice" },
        },
      },
    ]);

    // Format stats
    const formattedStats = {
      pending: { count: 0, totalAmount: 0 },
      confirmed: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 },
      completed: { count: 0, totalAmount: 0 },
      total: { count: 0, totalAmount: 0 },
    };

    stats.forEach((stat) => {
      if (formattedStats[stat._id]) {
        formattedStats[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
        };
      }
      formattedStats.total.count += stat.count;
      formattedStats.total.totalAmount += stat.totalAmount;
    });

    return successResponse(res, {
      statusCode: 200,
      message: "Booking stats retrieved successfully.",
      data: formattedStats,
    });
  } catch (error) {
    console.error("Get Booking Stats Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getMyTourBookings,
  getBookingDetails,
  getBookingStats,
};