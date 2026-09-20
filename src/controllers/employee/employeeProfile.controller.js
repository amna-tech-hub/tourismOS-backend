// controllers/employee/employeeProfile.controller.js
const Employee = require("../../models/Employee.model");
const Company = require("../../models/Company.model");
const User = require("../../models/User.model");
const { successResponse, errorResponse } = require("../../utils/response.util");

// ==========================================
// GET MY PROFILE
// ==========================================
const getMyProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      user: req.user.id,
      isDeleted: { $ne: true },
    })
      .populate("user", "name email phone gender avatar emailVerified")
      .populate("company", "companyName logo email phone address description");

    if (!employee) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Employee profile not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Profile retrieved successfully.",
      data: employee,
    });
  } catch (error) {
    console.error("Get My Profile Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// UPDATE MY PROFILE
// ==========================================
const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, gender, designation, department, address } = req.body;

    // Find employee record
    const employee = await Employee.findOne({
      user: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Employee profile not found.",
      });
    }

    // Update User fields (name, phone, gender)
    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name;
    if (phone !== undefined) userUpdates.phone = phone;
    if (gender !== undefined) userUpdates.gender = gender;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user.id, { $set: userUpdates }, { new: true, runValidators: true });
    }

    // Update Employee fields (designation, department, address)
    const employeeUpdates = {};
    if (designation !== undefined) employeeUpdates.designation = designation;
    if (department !== undefined) employeeUpdates.department = department;
    if (address !== undefined) employeeUpdates.address = address;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employee._id,
      { $set: employeeUpdates },
      { new: true, runValidators: true }
    )
      .populate("user", "name email phone gender avatar emailVerified")
      .populate("company", "companyName logo email phone address");

    return successResponse(res, {
      statusCode: 200,
      message: "Profile updated successfully.",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Update My Profile Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// GET MY COMPANY DETAILS
// ==========================================
const getMyCompany = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      user: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Employee profile not found.",
      });
    }

    const company = await Company.findOne({
      _id: employee.company,
      isDeleted: false,
    }).select(
      "companyName email phone address logo description status verificationStatus aiCredits totalRevenue totalBookings"
    );

    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Company not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Company details retrieved successfully.",
      data: company,
    });
  } catch (error) {
    console.error("Get My Company Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getMyCompany,
};