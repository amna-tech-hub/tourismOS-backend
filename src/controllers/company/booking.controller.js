const Booking = require("../../models/Booking.model");
const Company = require("../../models/Company.model");
const Employee = require("../../models/Employee.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util"); 
// Helper to resolve company
const getCompanyForUser = async (user) => {
  if (user.role === "company_admin") {
    return await Company.findOne({ ownerId: user.id, isDeleted: false });
  }
  if (user.role === "employee") {
    const employee = await Employee.findOne({ user: user.id, isDeleted: { $ne: true } });
    if (!employee) return null;
    return await Company.findOne({ _id: employee.company, isDeleted: false });
  }
  return null;
};
// Get All Bookings for Company Tours
const getCompanyBookings = async (req, res) => {
  try {
    const company = await getCompanyForUser(req.user);
    if (!company) {
      return errorResponse(res, { statusCode: 404, message: "Associated company profile not found." });
    }

    // 1. Base query scoped to company
    const baseQuery = Booking.find({
      company: company._id,
      isDeleted: { $ne: true },
    })
      .populate("traveler", "name email phone")
      .populate("tour", "title destination price");

    // 2. Count total documents matching base query for pagination meta
    const totalDocuments = await Booking.countDocuments({
      company: company._id,
      isDeleted: { $ne: true },
    });

    // 3. Instantiate and build ApiFeatures chain
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["status", "paymentStatus", "paymentMethod"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // 4. Execute final query
    const bookings = await features.query;

   const page = Number(req.query.page) || 1;
const limit = Number(req.query.limit) || 10;

return successResponse(res, {
  statusCode: 200,
  message: "Company bookings retrieved successfully.",
  data: bookings,
  meta: {
    totalDocuments,
    page,
    limit,
    totalPages: Math.ceil(totalDocuments / limit),
  },
});
  } catch (error) {
    console.error("Get Company Bookings Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};
// Update Booking Status (Approve / Reject / Complete)
const updateBookingStatus = async (req, res) => {
  try {
    const company = await getCompanyForUser(req.user);
    if (!company) {
      return errorResponse(res, { statusCode: 404, message: "Associated company profile not found." });
    }

    const { status } = req.body;
    const allowedStatuses = ["confirmed", "cancelled", "completed"];

    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, { statusCode: 400, message: "Invalid status status value." });
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: req.params.id,
        company: company._id,
        isDeleted: { $ne: true },
      },
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return errorResponse(res, { statusCode: 404, message: "Booking not found." });
    }

    return successResponse(res, {
      statusCode: 200,
      message: `Booking status updated to '${status}'.`,
      data: booking,
    });
  } catch (error) {
    console.error("Update Booking Status Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};

module.exports = {
  getCompanyBookings,
  updateBookingStatus,
};