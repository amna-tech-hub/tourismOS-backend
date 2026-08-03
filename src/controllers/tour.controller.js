const Tour = require("../models/Tour.model");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model");
const { successResponse, errorResponse } = require("../utils/response.util");
const ApiFeatures = require("../utils/apiFeatures.util");

// Helper to resolve company ID based on role
const getCompanyForUser = async (user, requestedCompanyId = null) => {
  // 1. Super Admin can target any company provided in req.body.companyId
  if (user.role === "super_admin") {
    if (requestedCompanyId) {
      return await Company.findOne({ _id: requestedCompanyId, isDeleted: false });
    }
    // Optional: Super admin's personal company profile if no companyId was passed
    return await Company.findOne({ ownerId: user.id, isDeleted: false });
  }

  // 2. Company Admin
  if (user.role === "company_admin") {
    return await Company.findOne({ ownerId: user.id, isDeleted: false });
  }

  // 3. Employee
  if (user.role === "employee") {
    const employee = await Employee.findOne({ user: user.id, isDeleted: { $ne: true } });
    if (!employee) return null;
    return await Company.findOne({ _id: employee.company, isDeleted: false });
  }

  return null;
};

// Create Tour
const createTour = async (req, res) => {
  try {
    const {
      companyId, // Allowed when super_admin creates a tour for a specific company
      title,
      description,
      destination,
      duration,
      price,
      maxParticipants,
      status,
      itinerary,
      budgetBreakdown,
      travelTips,
      bestTimeToVisit,
      importantNotes,
      coverImage,
      images,
    } = req.body;

    let company = null;

    // Check if super_admin is creating a global tour (without a company) or targeting one
    if (req.user.role === "super_admin" && !companyId) {
      // Super admin creating platform-wide/global tours without associating a company
      company = null;
    } else {
      company = await getCompanyForUser(req.user, companyId);
      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }
    }

    const tour = await Tour.create({
      company: company ? company._id : null,
      createdBy: req.user.id,
      title,
      description,
      destination,
      duration,
      price,
      maxParticipants,
      status: status || "draft",
      itinerary,
      budgetBreakdown,
      travelTips,
      bestTimeToVisit,
      importantNotes,
      coverImage,
      images,
    });

    return successResponse(res, {
      statusCode: 201,
      message: "Tour created successfully.",
      data: tour,
    });
  } catch (error) {
    console.error("Create Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// Get All Tours for company
const getAllTours = async (req, res) => {
  try {
    let filter = { isDeleted: false };

    // Super admins can view all tours or filter by company via query params (?companyId=xxx)
    if (req.user.role === "super_admin") {
      if (req.query.companyId) {
        filter.company = req.query.companyId;
      }
    } else {
      const company = await getCompanyForUser(req.user);
      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }
      filter.company = company._id;
    }

    const baseQuery = Tour.find(filter).populate("createdBy", "name email");
    const totalDocuments = await Tour.countDocuments(filter);

    const features = new ApiFeatures(baseQuery, req.query)
      .search()
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const tours = await features.query;

    return successResponse(res, {
      statusCode: 200,
      message: "Tours retrieved successfully.",
      data: tours,
      meta: { totalDocuments },
    });
  } catch (error) {
    console.error("Get All Tours Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// Get Public Tours (For end-users / frontend showcase)
const getPublicTours = async (req, res) => {
  try {
    const baseQuery = Tour.find({
      isDeleted: false,
      status: "published",
    }).populate("company", "companyName logo email phone address");

    const totalDocuments = await Tour.countDocuments({
      isDeleted: false,
      status: "published",
    });

    const features = new ApiFeatures(baseQuery, req.query)
      .search()
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const tours = await features.query;

    return successResponse(res, {
      statusCode: 200,
      message: "Public tours retrieved successfully.",
      data: tours,
      meta: { totalDocuments },
    });
  } catch (error) {
    console.error("Get Public Tours Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// Get Single Tour by ID
const getTourById = async (req, res) => {
  try {
    let filter = { _id: req.params.id, isDeleted: { $ne: true } };

    // Restrict non-super_admin users to their company's tours
    if (req.user.role !== "super_admin") {
      const company = await getCompanyForUser(req.user);
      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }
      filter.company = company._id;
    }

    const tour = await Tour.findOne(filter).populate("createdBy", "name email");

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour retrieved successfully.",
      data: tour,
    });
  } catch (error) {
    console.error("Get Tour By ID Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// Update Tour
const updateTour = async (req, res) => {
  try {
    let filter = { _id: req.params.id, isDeleted: { $ne: true } };

    // Restrict non-super_admin users to their company's tours
    if (req.user.role !== "super_admin") {
      const company = await getCompanyForUser(req.user);
      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }
      filter.company = company._id;
    }

    const allowedUpdates = [
      "title",
      "description",
      "destination",
      "duration",
      "price",
      "maxParticipants",
      "status",
      "itinerary",
      "budgetBreakdown",
      "travelTips",
      "bestTimeToVisit",
      "importantNotes",
      "coverImage",
      "images",
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedTour = await Tour.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedTour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour updated successfully.",
      data: updatedTour,
    });
  } catch (error) {
    console.error("Update Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// Soft Delete Tour
const deleteTour = async (req, res) => {
  try {
    let filter = { _id: req.params.id, isDeleted: { $ne: true } };

    if (req.user.role !== "super_admin") {
      const company = await getCompanyForUser(req.user);
      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }
      filter.company = company._id;
    }

    const tour = await Tour.findOneAndUpdate(
      filter,
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
// src/controllers/tour.controller.js
const tourSafetyService = require("../services/safety/tourSafety.service");

const getTourDetails = async (req, res) => {
  try {
    const { id } = req.body;
console.log("came inside tour-detail",id)
    // 1. Fetch tour from MongoDB
    const tour = await Tour.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate("company", "companyName logo")
      .populate("createdBy", "name email");

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour package not found.",
      });
    }

    // 2. Fetch daily safety & weather intelligence (cached / background refreshed)
    const dailySafety = await tourSafetyService.getTourSafety(tour);

    // 3. Return Combined Payload
    return successResponse(res, {
      statusCode: 200,
      message: "Tour details fetched successfully.",
      data: {
        tour,
        dailySafety,
      },
    });
  } catch (error) {
    console.error("Get Tour Details Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};


module.exports = {
  getTourDetails,
  createTour,
  getAllTours,
  getTourById,
  updateTour,
  deleteTour,
  getPublicTours,
};