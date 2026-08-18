const Payment = require("../../models/Payment.model");
const Booking = require("../../models/Booking.model");
const Company = require("../../models/Company.model");

const {
  successResponse,
  errorResponse,
} = require("../../utils/response.util");
const Role = require("../../models/Role.model");
const User = require("../../models/User.model");

// src/controllers/admin/analytics.controller.js

const getRevenueTrend = async (req, res) => {
  try {
    const now = new Date();   

    const startDate = new Date(
      now.getFullYear(),   
      now.getMonth() - 11,
      1               
    );

    const endDate = new Date(
      now.getFullYear(),   
      now.getMonth() + 1,   
      1        
    );

    // ============================================
    // 🆕 FIX: Only get COMMISSION from booking payments
    // ============================================
    const revenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          purpose: "booking", // 🆕 Only bookings have commission
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
          // 🆕 Use platformCommission instead of amount
          revenue: {
            $sum: "$platformCommission", 
          },
          // 🆕 Also track total booking value for context
          totalBookingValue: {
            $sum: "$amount",
          },
          // 🆕 Track company payouts
          totalPayouts: {
            $sum: "$companyPayout",
          },
          count: {
            $sum: 1,
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

    // ============================================
    // 🆕 Also get subscription revenue (100% platform)
    // ============================================
    const subscriptionRevenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          purpose: "subscription",
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
            $sum: "$amount", // For subscriptions, 100% is platform revenue
          },
          count: {
            $sum: 1,
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

    // Create maps for both
    const commissionMap = new Map(
      revenue.map((item) => [
        `${item._id.year}-${item._id.month}`,
        {
          commission: item.revenue,
          bookingValue: item.totalBookingValue,
          payouts: item.totalPayouts,
          count: item.count,
        },
      ])
    );

    const subscriptionMap = new Map(
      subscriptionRevenue.map((item) => [
        `${item._id.year}-${item._id.month}`,
        {
          subscriptionRevenue: item.revenue,
          count: item.count,
        },
      ])
    );

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
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

      const commissionData = commissionMap.get(key) || { 
        commission: 0, 
        bookingValue: 0, 
        payouts: 0,
        count: 0 
      };
      
      const subData = subscriptionMap.get(key) || { 
        subscriptionRevenue: 0,
        count: 0 
      };

      // 🆕 Total platform revenue = commission + subscription revenue
      const totalPlatformRevenue = commissionData.commission + subData.subscriptionRevenue;

      formattedRevenue.push({
        month: monthNames[monthNumber - 1],
        year,
        // 🆕 Platform earnings
        platformRevenue: totalPlatformRevenue,
        commissionRevenue: commissionData.commission,
        subscriptionRevenue: subData.subscriptionRevenue,
        // 🆕 Context data
        totalBookingValue: commissionData.bookingValue,
        totalPayoutsToCompanies: commissionData.payouts,
        transactionCount: commissionData.count + subData.count,
        // 🆕 Effective commission rate for this month
        effectiveRate: commissionData.bookingValue > 0 
          ? parseFloat(((commissionData.commission / commissionData.bookingValue) * 100).toFixed(2))
          : 0,
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Revenue trend fetched successfully.",
      data: {
        trend: formattedRevenue,
        summary: {
          totalPlatformRevenue: formattedRevenue.reduce((sum, item) => sum + item.platformRevenue, 0),
          totalCommission: formattedRevenue.reduce((sum, item) => sum + item.commissionRevenue, 0),
          totalSubscriptionRevenue: formattedRevenue.reduce((sum, item) => sum + item.subscriptionRevenue, 0),
          totalBookingValue: formattedRevenue.reduce((sum, item) => sum + item.totalBookingValue, 0),
          totalPayouts: formattedRevenue.reduce((sum, item) => sum + item.totalPayoutsToCompanies, 0),
          averageCommissionRate: formattedRevenue.reduce((sum, item) => sum + item.effectiveRate, 0) / formattedRevenue.length,
        }
      },
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

// src/controllers/admin/analytics.controller.js

const getPlatformStats = async (req, res, next) => {
  try {
    // 1. Find the ObjectId for the traveler role
    const travelerRole = await Role.findOne({ name: "traveler" });
    const travelerRoleId = travelerRole ? travelerRole._id : null;

    // ============================================
    // 🆕 FIX: Run all queries concurrently
    // ============================================
    const [
      totalCompanies,
      totalUsers,
      totalBookings,
      // 🆕 Booking Revenue (Commission from bookings)
      bookingRevenueAggregation,
      // 🆕 Subscription Revenue
      subscriptionRevenueAggregation,
      // 🆕 Total Value of all bookings (context)
      totalBookingValueAggregation,
      // 🆕 Total payouts to companies
      totalPayoutsAggregation,
    ] = await Promise.all([
      Company.countDocuments({ isDeleted: false }),
      User.countDocuments({
        role: travelerRoleId,
      }),
      Booking.countDocuments({ isDeleted: false }),
      
      // 🆕 Platform Commission from bookings
      Payment.aggregate([
        {
          $match: {
            status: "paid",
            purpose: "booking",
          },
        },
        {
          $group: {
            _id: null,
            totalCommission: { $sum: "$platformCommission" },
            totalPayments: { $sum: 1 },
          },
        },
      ]),
      
      // 🆕 Subscription Revenue (100% platform)
      Payment.aggregate([
        {
          $match: {
            status: "paid",
            purpose: "subscription",
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalPayments: { $sum: 1 },
          },
        },
      ]),
      
      // 🆕 Total Booking Value (for context)
      Payment.aggregate([
        {
          $match: {
            status: "paid",
            purpose: "booking",
          },
        },
        {
          $group: {
            _id: null,
            totalBookingValue: { $sum: "$amount" },
          },
        },
      ]),
      
      // 🆕 Total Company Payouts
      Payment.aggregate([
        {
          $match: {
            status: "paid",
            purpose: "booking",
          },
        },
        {
          $group: {
            _id: null,
            totalPayouts: { $sum: "$companyPayout" },
          },
        },
      ]),
    ]);

    const bookingRevenue = bookingRevenueAggregation.length > 0 
      ? bookingRevenueAggregation[0] 
      : { totalCommission: 0, totalPayments: 0 };
      
    const subscriptionRevenue = subscriptionRevenueAggregation.length > 0 
      ? subscriptionRevenueAggregation[0] 
      : { totalRevenue: 0, totalPayments: 0 };
      
    const totalBookingValue = totalBookingValueAggregation.length > 0 
      ? totalBookingValueAggregation[0].totalBookingValue 
      : 0;
      
    const totalPayouts = totalPayoutsAggregation.length > 0 
      ? totalPayoutsAggregation[0].totalPayouts 
      : 0;

    // 🆕 Total Platform Revenue = Booking Commission + Subscription Revenue
    const totalPlatformRevenue = bookingRevenue.totalCommission + subscriptionRevenue.totalRevenue;

    // 🆕 Effective commission rate
    const effectiveCommissionRate = totalBookingValue > 0
      ? parseFloat(((bookingRevenue.totalCommission / totalBookingValue) * 100).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      message: "Platform stats fetched successfully.",
      data: {
        // 🆕 Platform Revenue (What Super Admin actually earns)
        platformRevenue: {
          total: totalPlatformRevenue,
          fromBookings: bookingRevenue.totalCommission,
          fromSubscriptions: subscriptionRevenue.totalRevenue,
          bookingPaymentsCount: bookingRevenue.totalPayments,
          subscriptionPaymentsCount: subscriptionRevenue.totalPayments,
          effectiveCommissionRate,
        },
        // 🆕 Platform Activity Metrics
        activity: {
          totalCompanies,
          totalUsers,
          totalBookings,
          totalBookingValue, // Total value of all bookings (for context)
          totalPayoutsToCompanies: totalPayouts,
        },
        // 🆕 Health Metrics
        health: {
          averageRevenuePerCompany: totalCompanies > 0 
            ? Math.round(totalPlatformRevenue / totalCompanies) 
            : 0,
          averageBookingValue: totalBookings > 0 
            ? Math.round(totalBookingValue / totalBookings) 
            : 0,
        }
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
