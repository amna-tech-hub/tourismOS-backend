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

    const totalEmployees = await Employee.countDocuments({
      company: company._id,
      isDeleted: false,
    });

    const totalTours = await Tour.countDocuments({
      company: company._id,
      isDeleted: false,
    });

    const totalBookings = await Booking.countDocuments({
      company: company._id,
      isDeleted: false,
    });

    const revenueResult = await Booking.aggregate([
      {
        $match: {
          company: company._id,
          status: "completed",
          paymentStatus: "paid",
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].revenue : 0;

    // AI Credits Computations
    const totalCredits = company.aiCredits?.total || 0;
    const usedCredits = company.aiCredits?.used || 0;
    const remainingCredits = Math.max(0, totalCredits - usedCredits);
    const percentageUsed =
      totalCredits > 0 ? Number(((usedCredits / totalCredits) * 100).toFixed(1)) : 0;
    const percentageRemaining =
      totalCredits > 0 ? Number(((remainingCredits / totalCredits) * 100).toFixed(1)) : 0;
// Latest AI Credit Activity
const recentCreditActivity = await AICreditTransaction.find({
  company: company._id,
})
  .sort({ createdAt: -1 })
  .limit(5)
  .select(
    "type credits balanceAfter description createdAt"
  );
  const dashboardStats = {
  company: {
    id: company._id,
    name: company.companyName,
    status: company.status,
  },

  stats: {
    totalEmployees,
    totalTours,
    totalBookings,
    totalRevenue,
  },

  aiCredits: {
    total: totalCredits,
    used: usedCredits,
    remaining: remainingCredits,
    percentageUsed,
    percentageRemaining,
    lastUsedAt: company.aiCredits?.lastUsedAt || null,
    expiresAt: company.aiCredits?.expiresAt || null,
    plan: company.aiCredits?.plan || "Starter",

    recentActivity: recentCreditActivity,
  },
};

    return successResponse(res, {
      statusCode: 200,
      message: "Company dashboard stats retrieved successfully.",
      data: dashboardStats,
    });
  } catch (error) {
    console.error("Get Company Dashboard Error:", error);
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