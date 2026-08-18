const Company = require("../../models/Company.model");
const Employee = require("../../models/Employee.model");
const User = require("../../models/User.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const AICreditTransaction = require('../../models/AICreditTransaction.model')
const getCompanyProfile = async (req, res) => {
  try {
    // Find user to extract company reference
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    //  Fetch company details
    const company = await Company.findOne({ownerId:user._id})
    if (!company || company.isDeleted) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company profile not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Company profile retrieved successfully.",
      data: company,
    });
  } catch (error) {
    console.error("Get Company Profile Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal server error.",
    });
  }
};


const updateCompanyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company not found.",
      });
    }

    // Prevent updating sensitive fields directly
    const allowedUpdates = ["companyName", "phone", "address", "logo", "description"];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedCompany = await Company.findOneAndUpdate(
      {ownerId:user._id},
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedCompany || updatedCompany.isDeleted) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Company profile updated successfully.",
      data: updatedCompany,
    });
  } catch (error) {
    console.error("Update Company Profile Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal server error.",
    });
  }
};

const Tour = require("../../models/Tour.model");
const Booking = require("../../models/Booking.model");
const getCompanyDashboard = async (req, res) => {
  try {
    // ==========================================
    // 1. FIND LOGGED-IN USER
    // ==========================================

    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company not found.",
      });
    }

    // ==========================================
    // 2. FIND COMPANY
    // ==========================================

    const company = await Company.findOne({
      ownerId: user._id,
      isDeleted: false,
    });

    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company profile not found.",
      });
    }

    // ==========================================
    // 3. BOOKING TREND PERIOD
    // ==========================================

    const allowedPeriods = [7, 30, 90];

    let period = Number(req.query.period) || 30;

    if (!allowedPeriods.includes(period)) {
      period = 30;
    }

    const startDate = new Date();

    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (period - 1));

    // ==========================================
    // 4. RUN DASHBOARD QUERIES IN PARALLEL
    // ==========================================

    const [
      totalEmployees,
      totalTours,
      totalBookings,
      revenueResult,
      recentCreditActivity,
      recentBookings,
      recentTours,
      bookingTrendResult,
    ] = await Promise.all([
      // ========================================
      // TOTAL EMPLOYEES
      // ========================================

      Employee.countDocuments({
        company: company._id,
        isDeleted: false,
      }),

      // ========================================
      // TOTAL TOURS
      // ========================================

      Tour.countDocuments({
        company: company._id,
        isDeleted: false,
      }),

      // ========================================
      // TOTAL BOOKINGS
      // ========================================

      Booking.countDocuments({
        company: company._id,
        isDeleted: false,
      }),

      // ========================================
      // REVENUE
      //
      // Customer pays:
      // totalAmount
      //
      // Platform keeps:
      // platformCommission
      //
      // Company receives:
      // companyPayout
      // ========================================

      Booking.aggregate([
        {
          $match: {
            company: company._id,
            status: "confirmed",
            paymentStatus: "paid",
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,

            // Total amount paid by customers
            grossRevenue: {
              $sum: "$totalAmount",
            },

            // TourismOS commission
            platformCommission: {
              $sum: "$platformCommission",
            },

            // Actual company earnings
            companyRevenue: {
              $sum: "$companyPayout",
            },
          },
        },
      ]),

      // ========================================
      // RECENT AI CREDIT ACTIVITY
      // ========================================

      AICreditTransaction.find({
        company: company._id,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "type credits balanceBefore balanceAfter description referenceId createdAt"
        )
        .lean(),

      // ========================================
      // RECENT BOOKINGS
      // ========================================

      Booking.find({
        company: company._id,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("traveler", "name email phone")
        .populate("tour", "title from to price")
        .select(
          "traveler tour totalAmount platformCommission companyPayout status paymentStatus createdAt"
        )
        .lean(),

      // ========================================
      // RECENT TOURS
      // ========================================

      Tour.find({
        company: company._id,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "title from to price status duration maxParticipants createdAt"
        )
        .lean(),

      // ========================================
      // BOOKING TREND
      // ========================================

      Booking.aggregate([
        {
          $match: {
            company: company._id,
            isDeleted: false,
            createdAt: {
              $gte: startDate,
            },
          },
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },

            bookings: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]),
    ]);

    // ==========================================
    // 5. REVENUE CALCULATIONS
    // ==========================================

    const grossRevenue =
      revenueResult.length > 0
        ? revenueResult[0].grossRevenue || 0
        : 0;

    const totalCommission =
      revenueResult.length > 0
        ? revenueResult[0].platformCommission || 0
        : 0;

    const totalRevenue =
      revenueResult.length > 0
        ? revenueResult[0].companyRevenue || 0
        : 0;

    // ==========================================
    // 6. AI CREDIT CALCULATIONS
    // ==========================================

    const totalCredits =
      company.aiCredits?.total || 0;

    const usedCredits =
      company.aiCredits?.used || 0;

    const remainingCredits = Math.max(
      0,
      totalCredits - usedCredits
    );

    const percentageUsed =
      totalCredits > 0
        ? Number(
            ((usedCredits / totalCredits) * 100).toFixed(1)
          )
        : 0;

    const percentageRemaining =
      totalCredits > 0
        ? Number(
            ((remainingCredits / totalCredits) * 100).toFixed(1)
          )
        : 0;

    // ==========================================
    // 7. FORMAT BOOKING TREND
    // ==========================================

    const bookingMap = new Map();

    bookingTrendResult.forEach((item) => {
      bookingMap.set(item._id, item.bookings);
    });

    const bookingTrend = [];

    for (let i = 0; i < period; i++) {
      const date = new Date(startDate);

      date.setDate(startDate.getDate() + i);

      const dateString =
        date.toISOString().split("T")[0];

      bookingTrend.push({
        date: dateString,
        bookings: bookingMap.get(dateString) || 0,
      });
    }

    // ==========================================
    // 8. DASHBOARD RESPONSE
    // ==========================================

    const dashboardStats = {
      company: {
        id: company._id,
        name: company.companyName,
        status: company.status,
      },

      // ========================================
      // KPI STATISTICS
      // ========================================

      stats: {
        totalEmployees,
        totalTours,
        totalBookings,

        // Company's actual earnings
        totalRevenue,

        // Additional financial information
        grossRevenue,
        totalCommission,
      },

      // ========================================
      // BOOKING CHART
      // ========================================

      bookingTrend: {
        period,
        data: bookingTrend,
      },

      // ========================================
      // RECENT BOOKINGS
      // ========================================

      recentBookings,

      // ========================================
      // RECENT TOURS
      // ========================================

      recentTours,

      // ========================================
      // AI CREDITS
      // ========================================

      aiCredits: {
        total: totalCredits,
        used: usedCredits,
        remaining: remainingCredits,

        percentageUsed,
        percentageRemaining,

        lastUsedAt:
          company.aiCredits?.lastUsedAt || null,

        expiresAt:
          company.aiCredits?.expiresAt || null,

        plan:
          company.aiCredits?.plan || "Starter",

        recentActivity: recentCreditActivity,
      },
    };

    // ==========================================
    // 9. RESPONSE
    // ==========================================

    return successResponse(res, {
      statusCode: 200,
      message:
        "Company dashboard retrieved successfully.",
      data: dashboardStats,
    });
  } catch (error) {
    console.error(
      "Get Company Dashboard Error:",
      error
    );

    return errorResponse(res, {
      statusCode: 500,
      message: "Internal server error.",
    });
  }
};
const getCreditHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company not found.",
      });
    }

    const company = await Company.findOne({ ownerId: user._id });

    if (!company || company.isDeleted) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company profile not found.",
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, totalTransactions] = await Promise.all([
      AICreditTransaction.find({ company: company._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "type credits balanceBefore balanceAfter description referenceId createdAt"
        ),

      AICreditTransaction.countDocuments({
        company: company._id,
      }),
    ]);

    return successResponse(res, {
      statusCode: 200,
      message: "Credit history retrieved successfully.",
      data: {
        currentBalance:
          company.aiCredits.total - company.aiCredits.used,

        totalCredits: company.aiCredits.total,
        usedCredits: company.aiCredits.used,

        pagination: {
          page,
          limit,
          totalTransactions,
          totalPages: Math.ceil(totalTransactions / limit),
        },

        transactions,
      },
    });
  } catch (error) {
    console.error("Get Credit History Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: "Internal server error.",
    });
  }
};
module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanyDashboard,
  getCreditHistory
};