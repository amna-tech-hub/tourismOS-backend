const Company = require("../../models/Company.model");
const User = require("../../models/User.model");
const { successResponse, errorResponse } = require("../../utils/response.util");

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


const getCompanyDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company not found.",
      });
    }

    const company = await Company.findOne({ownerId:user._id});
    if (!company || company.isDeleted) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company profile not found.",
      });
    }

    // Dashboard Overview Stats 
    const dashboardStats = {
      company: {
        id: company._id,
        name: company.companyName,
        status: company.status,
      },
      stats: {
        totalEmployees: 0,
        totalTours: 0,
        totalBookings: 0,
        totalRevenue: 0,
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

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanyDashboard,
};