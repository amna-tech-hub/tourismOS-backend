const Booking = require("../../models/Booking.model");
const Company = require("../../models/Company.model");
const Employee = require("../../models/Employee.model");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util");
const notificationService = require("../../services/notification/notification.service");
// ==========================================
// HELPER
// ==========================================

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

    if (!employee) {
      return null;
    }

    return await Company.findOne({
      _id: employee.company,
      isDeleted: false,
    });
  }

  return null;
};

// ==========================================
// GET COMPANY BOOKINGS
// ==========================================

const getCompanyBookings = async (req, res) => {
  try {
    const company = await getCompanyForUser(req.user);

    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // ==========================================
    // BASE COMPANY FILTER
    // ==========================================

    const companyFilter = {
      company: company._id,
      isDeleted: { $ne: true },
    };

    // ==========================================
    // BOOKINGS QUERY
    // ==========================================

    const baseQuery = Booking.find(companyFilter)
      .populate("traveler", "name email phone profilePicture")
      .populate("tour", "title destination price");

    // ==========================================
    // API FEATURES
    // ==========================================

    const features = new ApiFeatures(baseQuery, req.query)
      .search([
           "title",
        "status",
        "paymentStatus",
        "paymentMethod",
        "name",
        "email",
     
      ])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query;

    // ==========================================
    // PAGINATION
    // ==========================================

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const totalDocuments = await Booking.countDocuments(companyFilter);

    // ==========================================
    // BOOKING STATISTICS
    // ==========================================

    const statistics = await Booking.aggregate([
      {
        $match: companyFilter,
      },

      {
        $facet: {
          // ------------------------------------------
          // TOTAL BOOKINGS
          // ------------------------------------------
          totalBookings: [
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // PENDING BOOKINGS
          // ------------------------------------------
          pendingBookings: [
            {
              $match: {
                status: "pending",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // CONFIRMED BOOKINGS
          // ------------------------------------------
          confirmedBookings: [
            {
              $match: {
                status: "confirmed",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // COMPLETED BOOKINGS
          // ------------------------------------------
          completedBookings: [
            {
              $match: {
                status: "completed",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // CANCELLED BOOKINGS
          // ------------------------------------------
          cancelledBookings: [
            {
              $match: {
                status: "cancelled",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // PAID BOOKINGS
          // ------------------------------------------
          paidBookings: [
            {
              $match: {
                paymentStatus: "paid",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // PENDING PAYMENTS
          // ------------------------------------------
          pendingPayments: [
            {
              $match: {
                paymentStatus: "pending",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // REFUNDED PAYMENTS
          // ------------------------------------------
          refundedPayments: [
            {
              $match: {
                paymentStatus: "refunded",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // UNIQUE TRAVELERS
          // ------------------------------------------
          uniqueTravelers: [
            {
              $group: {
                _id: "$traveler",
              },
            },
            {
              $count: "count",
            },
          ],

          // ------------------------------------------
          // REVENUE
          //
          // Only PAID bookings
          // Excludes CANCELLED bookings
          // ------------------------------------------
          revenue: [
            {
              $match: {
                paymentStatus: "paid",
                status: {
                  $ne: "cancelled",
                },
              },
            },

            {
              $group: {
                _id: null,

                grossRevenue: {
                  $sum: "$totalAmount",
                },

                platformCommission: {
                  $sum: "$platformCommission",
                },

                companyRevenue: {
                  $sum: "$companyPayout",
                },

                totalParticipants: {
                  $sum: "$participants",
                },
              },
            },
          ],
        },
      },
    ]);

    const stats = statistics[0];
console.log(stats,"stats boking");

    // ==========================================
    // FORMAT STATISTICS
    // ==========================================

    const revenue = stats.revenue[0] || {};

    const formattedStats = {
      totalBookings:
        stats.totalBookings[0]?.count || 0,

      pendingBookings:
        stats.pendingBookings[0]?.count || 0,

      confirmedBookings:
        stats.confirmedBookings[0]?.count || 0,

      completedBookings:
        stats.completedBookings[0]?.count || 0,

      cancelledBookings:
        stats.cancelledBookings[0]?.count || 0,

      paidBookings:
        stats.paidBookings[0]?.count || 0,

      pendingPayments:
        stats.pendingPayments[0]?.count || 0,

      refundedPayments:
        stats.refundedPayments[0]?.count || 0,

      uniqueTravelers:
        stats.uniqueTravelers[0]?.count || 0,

      // ==========================================
      // REVENUE
      // ==========================================

      grossRevenue:
        revenue.grossRevenue || 0,

      platformCommission:
        revenue.platformCommission || 0,

      companyRevenue:
        revenue.companyRevenue || 0,

      totalParticipants:
        revenue.totalParticipants || 0,
    };

    // ==========================================
    // RESPONSE
    // ==========================================

    return successResponse(res, {
      statusCode: 200,

      message: "Company bookings retrieved successfully.",

      data: bookings,

      meta: {
        totalDocuments,
        page,
        limit,
        totalPages: Math.ceil(
          totalDocuments / limit
        ),
      },

      stats: formattedStats,
    });
  } catch (error) {
    console.error(
      "Get Company Bookings Error:",
      error
    );

    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ==========================================
// UPDATE BOOKING STATUS
// ==========================================

const updateBookingStatus = async (req, res) => {
  try {
    const company = await getCompanyForUser(req.user);

    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message:
          "Associated company profile not found.",
      });
    }

    const { status } = req.body;

    const allowedStatuses = [
      "confirmed",
      "cancelled",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid booking status value.",
      });
    }

    const booking =
      await Booking.findOneAndUpdate(
        {
          _id: req.params.id,
          company: company._id,
          isDeleted: { $ne: true },
        },
        {
          $set: {
            status,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "traveler",
          "name email phone"
        )
        .populate(
          "tour",
          "title destination price"
        );

    if (!booking) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Booking not found.",
      });
    }
await notificationService.sendToUser(
  booking.traveler._id,
  {
    title:
      status === "confirmed"
        ? "Booking Confirmed 🎉"
        : status === "cancelled"
        ? "Booking Cancelled"
        : "Tour Completed",

    body:
      status === "confirmed"
        ? `Your booking for "${booking.tour?.title}" has been confirmed.`
        : status === "cancelled"
        ? `Your booking for "${booking.tour?.title}" has been cancelled.`
        : `Your tour "${booking.tour?.title}" has been marked as completed.`,

    type: "BOOKING_UPDATE",

    extraData: {
      bookingId: booking._id.toString(),
      tourId: booking.tour?._id?.toString(),
      status,
      screen: "booking",
    },
  }
);
    return successResponse(res, {
      statusCode: 200,

      message: `Booking status updated to '${status}'.`,

      data: booking,
    });
  } catch (error) {
    console.error(
      "Update Booking Status Error:",
      error
    );

    return errorResponse(res, {
      statusCode: 500,
      message:
        error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getCompanyBookings,
  updateBookingStatus,
};