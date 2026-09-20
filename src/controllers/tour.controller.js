const Tour = require("../models/Tour.model");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model");
const { successResponse, errorResponse } = require("../utils/response.util");
const ApiFeatures = require("../utils/apiFeatures.util");
const tourSafetyService = require("../services/safety/tourSafety.service");

// Helper to resolve company ID based on role
const getCompanyForUser = async (user) => {
  // Company Admin
  if (user.role === "company_admin") {
    return await Company.findOne({
      ownerId: user.id,
      isDeleted: false,
    });
  }

  // Employee
  if (user.role === "employee") {
    const employee = await Employee.findOne({
      user: user.id,
      isDeleted: { $ne: true },
    });

    if (!employee) return null;

    return await Company.findOne({
      _id: employee.company,
      isDeleted: false,
    });
  }

  return null;
};

// Create Tour
const createTour = async (req, res) => {
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

    let companyId = null;

    // ==========================================
    // SUPER ADMIN
    // Platform tour → company is intentionally null
    // ==========================================

    if (req.user.role === "super_admin") {
      companyId = null;
    }

    // ==========================================
    // COMPANY ADMIN / EMPLOYEE
    // Resolve company from authenticated user
    // ==========================================

    else {
      const company = await getCompanyForUser(req.user);

      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }

      companyId = company._id;
    }

    // ==========================================
    // CREATE TOUR
    // ==========================================

    const tour = await Tour.create({
      company: companyId,
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
    console.error("Create Tour Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// Get All Tours for company
// Get All Tours for company (with pagination)
const getAllTours = async (req, res) => {
  try {
    let filter = {
      isDeleted: false,
    };

    // ==========================================
    // SUPER ADMIN - Can see ALL tours
    // Optional: Filter by companyId if provided
    // ==========================================

    if (req.user.role === "super_admin") {
      // If companyId is provided in query, filter by it
      if (req.query.companyId) {
        filter.company = req.query.companyId;
      }
      // Otherwise, show ALL tours from ALL companies
    }

    // ==========================================
    // COMPANY ADMIN / EMPLOYEE
    // Can only see their company's tours
    // ==========================================

    else {
      const company = await getCompanyForUser(req.user);

      if (!company) {
        return errorResponse(res, {
          statusCode: 404,
          message: "Associated company profile not found.",
        });
      }

      filter.company = company._id;
    }

    // ==========================================
    // Get total count BEFORE pagination
    // ==========================================

    const totalDocuments = await Tour.countDocuments(filter);

    // ==========================================
    // Build query with search/filter/sort/pagination
    // ==========================================

    const baseQuery = Tour.find(filter)
      .populate("createdBy", "name email")
      .populate("company", "companyName logo");

   const features = new ApiFeatures(baseQuery, req.query)
  .search(["title", "from", "to"])
  .filter()
  .sort()
  .limitFields()
  .paginate();
    const tours = await features.query;

    // ==========================================
    // Calculate pagination metadata
    // ==========================================

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const totalPages = Math.ceil(totalDocuments / limit);

    // ==========================================
    // Return response with pagination metadata
    // ==========================================

    return successResponse(res, {
      statusCode: 200,
      message: "Tours retrieved successfully.",
      data: tours,
      meta: {
        totalDocuments,
        totalPages,
        currentPage: page,
        limit: limit,
      },
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
    const {
      platform,
      companyId,
    } = req.query;

    // ==========================================
    // BASE FILTER
    // ==========================================

    const filter = {
      isDeleted: false,
      status: "published",
    };

    // ==========================================
    // PLATFORM / COMPANY TYPE
    // ==========================================

    if (platform === "platform") {
      // Tours created directly by TourismOS
      filter.company = null;
    }

    if (platform === "company") {
      // Tours created by travel companies
      filter.company = { $ne: null };
    }

    // ==========================================
    // SPECIFIC COMPANY FILTER
    // ==========================================

    if (companyId) {
      filter.company = companyId;
    }

    // ==========================================
    // BASE QUERY
    // ==========================================

    const baseQuery = Tour.find(filter).populate(
      "company",
      "companyName logo email phone address"
    );

    // ==========================================
    // TOTAL DOCUMENTS
    // ==========================================

    const totalDocuments = await Tour.countDocuments(
      filter
    );

    // ==========================================
    // API FEATURES
    // ==========================================

    const features = new ApiFeatures(
      baseQuery,
      req.query
    )
      .search([
        "title",
        "description",
        "from",
        "to",
      ])
      .filter([
        "platform",
        "companyId",
      ])
      .sort()
      .limitFields()
      .paginate();

    // ==========================================
    // EXECUTE QUERY
    // ==========================================

    const tours = await features.query;

    // ==========================================
    // RESPONSE
    // ==========================================

    return successResponse(res, {
      statusCode: 200,
      message: "Public tours retrieved successfully.",
      data: tours,
      meta: {
        totalDocuments,
      },
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

    const tour = await Tour.findOne(filter).populate("createdBy", "companyName email");

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
const publishTour = async (req, res) => {
  try {
    const { id } = req.params;

    let filter = {
      _id: id,
      isDeleted: false,
    };

    // ==========================================
    // COMPANY ADMIN / EMPLOYEE
    // Only their company's tours
    // ==========================================

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

    // ==========================================
    // FIND TOUR
    // ==========================================

    const tour = await Tour.findOne(filter);

    if (!tour) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Tour not found.",
      });
    }

    // ==========================================
    // ONLY DRAFTS CAN BE PUBLISHED
    // ==========================================

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
    console.error("Publish Tour Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: "Failed to publish tour.",
    });
  }
};
// Update Tour
const updateTour = async (req, res) => {
  console.log("came inside updatetour");
  
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
      "from", // Replaced destination
      "to",   // Replaced destination
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

const getTourDetails = async (req, res) => {
  try {
    const { id } = req.body;

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
  publishTour
};