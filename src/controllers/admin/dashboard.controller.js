const Payment = require("../../models/Payment.model");
const Booking = require("../../models/Booking.model");
const Company = require("../../models/Company.model");

const {
  successResponse,
  errorResponse,
} = require("../../utils/response.util");
const Role = require("../../models/Role.model");
const User = require("../../models/User.model");

const getRevenueTrend = async (req, res) => {
  try {
    const now = new Date();   

   
    const startDate = new Date(
      now.getFullYear(),   
      now.getMonth() - 11,
      1               
    );

    
    const endDate = new Date(
      now.getFullYear(),   //2026
      now.getMonth() + 1,   //aug=7+1=8
      1        //september-1-2026
    );
    const revenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paidAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },

      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
          },
          revenue: {
            $sum: "$amount",
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    const revenueMap = new Map(
      revenue.map((item) => [
        `${item._id.year}-${item._id.month}`,
        item.revenue,
      ])
    );

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formattedRevenue = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - 11 + i,
        1
      );

      const year = date.getFullYear();
      const monthNumber = date.getMonth() + 1;

      const key = `${year}-${monthNumber}`;

      formattedRevenue.push({
        month: monthNames[monthNumber - 1],
        year,
        revenue: revenueMap.get(key) || 0,
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Revenue trend fetched successfully.",
      data: formattedRevenue,
    });
  } catch (error) {
    console.error("Revenue Trend Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

/**
 * @desc    Get booking status distribution for dashboard overview
 * @route   GET /api/v1/admin/dashboard/booking-overview
 * @access  Private (Super Admin)
 */
const getBookingOverview = async (req, res, next) => {
  try {
    const expectedStatuses = ["pending", "confirmed", "cancelled"];

    // Aggregate counts by status (excluding soft-deleted bookings)
    const aggregatedData = await Booking.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Map aggregation results into a dictionary
    const statusMap = aggregatedData.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Always guarantee all 4 statuses are returned
    const formattedData = expectedStatuses.map((status) => ({
      status,
      count: statusMap[status] || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Booking overview fetched successfully.",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get company status distribution for dashboard overview
 * @route   GET /api/v1/admin/dashboard/company-overview
 * @access  Private (Super Admin)
 */
const getCompanyOverview = async (req, res, next) => {
  try {
    const expectedStatuses = ["active", "inactive", "suspended"];

    // Aggregate counts by status (excluding soft-deleted companies)
    const aggregatedData = await Company.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Map aggregation results into a dictionary
    const statusMap = aggregatedData.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    // Always guarantee all statuses are returned
    const formattedData = expectedStatuses.map((status) => ({
      status,
      count: statusMap[status] || 0,
    }));

    return res.status(200).json({
      success: true,
      message: "Company overview fetched successfully.",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};


const getPlatformStats = async (req, res, next) => {
  try {
    // 1. Find the ObjectId for the traveler role
    const travelerRole = await Role.findOne({ name: "traveler" });
    const travelerRoleId = travelerRole ? travelerRole._id : null;

    // 2. Run all queries concurrently at the database level
    const [totalCompanies, totalUsers, totalBookings, revenueAggregation] =
      await Promise.all([
        Company.countDocuments({ isDeleted: false }),
        User.countDocuments({
          role: travelerRoleId,
        //   isDeleted: false,
        }),
        Booking.countDocuments({ isDeleted: false }),
        Payment.aggregate([
          {
            $match: {
              status: "paid",
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
            },
          },
        ]),
      ]);

    const totalRevenue =
      revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    return res.status(200).json({
      success: true,
      message: "Platform stats fetched successfully.",
      data: {
        totalCompanies,
        totalUsers,
        totalBookings,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getBookingOverview,
  getCompanyOverview,
    getRevenueTrend,
  getPlatformStats,

};
