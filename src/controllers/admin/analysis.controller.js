// src/controllers/admin/analytics.controller.js
const Company = require("../../models/Company.model");
const User = require("../../models/User.model");
const ApiFeatures = require("../../utils/apiFeatures.util");
const {
    successResponse,
    errorResponse,
} = require("../../utils/response.util");
const Payment=require('../../models/Payment.model')
 const getPhase1Analytics = async (req, res) => {
  try {
    const now = new Date();
    const currentWindowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const currentWindowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // ============================================
    // 🆕 PLATFORM REVENUE (Commission only)
    // ============================================
    const platformRevenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          purpose: "booking", // Only bookings have commission
          paidAt: { $gte: currentWindowStart, $lt: currentWindowEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalCommission: { $sum: "$platformCommission" },
          totalBookingValue: { $sum: "$amount" },
          totalPayouts: { $sum: "$companyPayout" },
          count: { $sum: 1 }
        }
      }
    ]);

    // ============================================
    // 🆕 SUBSCRIPTION REVENUE (100% platform)
    // ============================================
    const subscriptionRevenue = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          purpose: "subscription",
          paidAt: { $gte: currentWindowStart, $lt: currentWindowEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      }
    ]);

    const platformStats = platformRevenue[0] || { 
      totalCommission: 0, 
      totalBookingValue: 0, 
      totalPayouts: 0,
      count: 0 
    };

    const subStats = subscriptionRevenue[0] || { total: 0, count: 0 };

    // ============================================
    // 🆕 TOP COMPANIES (By Revenue Generated)
    // ============================================
    const topCompanies = await Company.aggregate([
      { $match: { isDeleted: false } },
      {
        $lookup: {
          from: "payments",
          let: { companyId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$companyId", "$$companyId"] }, // You need to add companyId to Payment
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$purpose", "booking"] }
                  ]
                }
              }
            }
          ],
          as: "payments"
        }
      },
      {
        $project: {
          companyName: 1,
          logo: 1,
          totalRevenue: { $sum: "$payments.companyPayout" }, // Their earnings
          totalCommission: { $sum: "$payments.platformCommission" }, // What platform earned
          totalBookings: { $size: "$payments" },
          avgBookingValue: {
            $cond: [
              { $gt: [{ $size: "$payments" }, 0] },
              { $divide: [{ $sum: "$payments.companyPayout" }, { $size: "$payments" }] },
              0
            ]
          }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // ============================================
    // FINAL RESPONSE
    // ============================================
    return successResponse(res, {
      statusCode: 200,
      message: "Phase 1 analytics fetched successfully.",
      data: {
        kpis: {
          // 🆕 Platform earns from both bookings AND subscriptions
          totalPlatformRevenue: platformStats.totalCommission + subStats.total,
          bookingCommission: platformStats.totalCommission,
          subscriptionRevenue: subStats.total,
          totalBookingValue: platformStats.totalBookingValue, // Context only
          totalPayoutsToCompanies: platformStats.totalPayouts,
          totalTransactions: platformStats.count + subStats.count,
          
          // 🆕 Effective commission rate
          effectiveCommissionRate: platformStats.totalBookingValue > 0
            ? parseFloat(((platformStats.totalCommission / platformStats.totalBookingValue) * 100).toFixed(2))
            : 0,
        },
        
        // 🆕 Monthly trends
        revenuePerformance: {
          // You'll need to build monthly aggregation here
          // Similar to before but using platformCommission
        },
        
        companyPerformance: {
          topCompanies: topCompanies,
          totalActiveCompanies: await Company.countDocuments({ 
            isDeleted: false,
            status: 'active' 
          }),
        }
      },
    });
  } catch (error) {
    console.error("Phase 1 Analytics Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error during analytics processing",
    });
  }
};


module.exports = {
  getPhase1Analytics
};