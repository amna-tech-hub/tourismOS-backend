// controllers/employee/employeeTour.controller.js
const Tour = require("../../models/Tour.model");
const Company = require("../../models/Company.model");
const Employee = require("../../models/Employee.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util");
const tourSafetyService = require("../../services/safety/tourSafety.service");

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

// Helper: Get employee record
const getEmployee = async (userId) => {
  return await Employee.findOne({
    user: userId,
    isDeleted: { $ne: true },
  });
};

// ==========================================
// CREATE TOUR (Employee)
// ==========================================
const createMyTour = async (req, res) => {
  try {
    const {
      title,
      description,
      from,
      to,
      duration,
      price,
      maxParticipants,
      status,
      itinerary,
      budgetBreakdown,
      travelTips,
      bestTimeToVisit,
      importantNotes,
      faqs,
      coverImage,
      images,
    } = req.body;

    // Get employee's company
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // Create tour scoped to employee's company
    const tour = await Tour.create({
      company: company._id,
      createdBy: req.user.id,

      title,
      description,
      from,
      to,
      duration,
      price,
      maxParticipants,

      status: status || "draft",

      itinerary,
      budgetBreakdown,
      travelTips,
      bestTimeToVisit,
      importantNotes,
      faqs,

      coverImage,
      images,
    });

    return successResponse(res, {
      statusCode: 201,
      message: "Tour created successfully.",
      data: tour,
    });
  } catch (error) {
    console.error("Create My Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// GET MY TOURS (Employee's own tours)
// ==========================================
const getMyTours = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // Filter: Only tours created by this employee
    const filter = {
      company: company._id,
      createdBy: req.user.id,
      isDeleted: false,
    };

    // Total count before pagination
    const totalDocuments = await Tour.countDocuments(filter);

    // Base query
    const baseQuery = Tour.find(filter)
      .populate("company", "companyName logo")
      .populate("createdBy", "name email");

    // Apply ApiFeatures
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["title", "from", "to"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const tours = await features.query;

    // Pagination metadata
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalDocuments / limit);

    return successResponse(res, {
      statusCode: 200,
      message: "My tours retrieved successfully.",
      data: tours,
      meta: {
        totalDocuments,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Get My Tours Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET MY SINGLE TOUR
// ==========================================
const getMyTourById = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    const tour = await Tour.findOne({
      _id: req.params.id,
      company: company._id,
      createdBy: req.user.id, // Only own tours
      isDeleted: { $ne: true },
    })
      .populate("company", "companyName logo email phone address")
      .populate("createdBy", "name email");

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found or you don't have permission to view it.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour retrieved successfully.",
      data: tour,
    });
  } catch (error) {
    console.error("Get My Tour By ID Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ==========================================
// GET MY TOUR DETAILS (with safety data)
// ==========================================
const getMyTourDetails = async (req, res) => {
  try {
    const { id } = req.body;

    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // Fetch tour from MongoDB - only own tours
    const tour = await Tour.findOne({
      _id: id,
      company: company._id,
      createdBy: req.user.id,
      isDeleted: { $ne: true },
    })
      .populate("company", "companyName logo")
      .populate("createdBy", "name email");

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour package not found.",
      });
    }

    // Fetch daily safety & weather intelligence
    let dailySafety = null;
    try {
      dailySafety = await tourSafetyService.getTourSafety(tour);
    } catch (safetyError) {
      console.error("Safety service error:", safetyError);
      // Don't fail the whole request if safety service fails
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour details fetched successfully.",
      data: {
        tour,
        dailySafety,
      },
    });
  } catch (error) {
    console.error("Get My Tour Details Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// UPDATE MY TOUR
// ==========================================
const updateMyTour = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    const allowedUpdates = [
      "title",
      "description",
      "from",
      "to",
      "duration",
      "price",
      "maxParticipants",
      "status",
      "itinerary",
      "budgetBreakdown",
      "travelTips",
      "bestTimeToVisit",
      "importantNotes",
      "faqs",
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
      {
        _id: req.params.id,
        company: company._id,
        createdBy: req.user.id, // Only own tours
        isDeleted: { $ne: true },
      },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedTour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found or you don't have permission to update it.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour updated successfully.",
      data: updatedTour,
    });
  } catch (error) {
    console.error("Update My Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// PUBLISH MY TOUR
// ==========================================
const publishMyTour = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    const tour = await Tour.findOne({
      _id: req.params.id,
      company: company._id,
      createdBy: req.user.id, // Only own tours
      isDeleted: false,
    });

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found or you don't have permission to publish it.",
      });
    }

    if (tour.status === "published") {
      return errorResponse(res, {
        statusCode: 400,
        message: "Tour is already published.",
      });
    }

    tour.status = "published";
    await tour.save();

    return successResponse(res, {
      statusCode: 200,
      message: "Tour published successfully.",
      data: tour,
    });
  } catch (error) {
    console.error("Publish My Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Failed to publish tour.",
    });
  }
};

// ==========================================
// DELETE MY TOUR (Soft Delete)
// ==========================================
const deleteMyTour = async (req, res) => {
  try {
    const company = await getEmployeeCompany(req.user.id);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    const tour = await Tour.findOneAndUpdate(
      {
        _id: req.params.id,
        company: company._id,
        createdBy: req.user.id, // Only own tours
        isDeleted: { $ne: true },
      },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found or you don't have permission to delete it.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Tour deleted successfully.",
      data: null,
    });
  } catch (error) {
    console.error("Delete My Tour Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createMyTour,
  getMyTours,
  getMyTourById,
  getMyTourDetails,
  updateMyTour,
  publishMyTour,
  deleteMyTour,
};