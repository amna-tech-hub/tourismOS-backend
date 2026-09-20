// src/controllers/traveler/booking.controller.js

const Booking = require("../../models/Booking.model");
const Tour = require("../../models/Tour.model");
const Payment = require("../../models/Payment.model");
const paymentManager = require("../../manager/payment.manager");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util");
const notificationService = require("../../services/notification/notification.service");
const Company = require("../../models/Company.model");

// ======================================================
// CREATE BOOKING & INITIATE PAYMENT
// ======================================================

// ======================================================
// CREATE BOOKING & INITIATE PAYMENT
// ======================================================

const createBooking = async (req, res) => {
  try {
    const {
      tourId,
      participants = 1,
      travelDate,
      provider = "jazzcash",
    } = req.body;

    // ==================================================
    // 1. VALIDATE INPUT
    // ==================================================

    if (!tourId || !travelDate) {
      
      return errorResponse(res, {
        statusCode: 400,
        message: "Tour and travel date are required.",
      });
    }

    const participantCount = Number(participants);

    if (!Number.isInteger(participantCount) || participantCount < 1) {
      
      return errorResponse(res, {
        statusCode: 400,
        message: "Participants must be at least 1.",
      });
    }

    // ==================================================
    // 2. VALIDATE TRAVEL DATE
    // ==================================================

    const selectedTravelDate = new Date(travelDate);

    if (Number.isNaN(selectedTravelDate.getTime())) {

      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid travel date.",
      });
    }

    // Normalize date to start of day.
    // This makes bookings for the same calendar date
    // compare consistently.
    selectedTravelDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedTravelDate < today) {

      return errorResponse(res, {
        statusCode: 400,
        message: "Travel date cannot be in the past.",
      });
    }

    // ==================================================
    // 3. VALIDATE TOUR
    // ==================================================

    const tour = await Tour.findOne({
      _id: tourId,
      isDeleted: { $ne: true },
    });

    if (!tour) {

      return errorResponse(res, {

        statusCode: 404,
        message: "Tour not found.",
      });
    }

    if (tour.status !== "published") {

      return errorResponse(res, {
        statusCode: 400,
        message: "This tour is currently not available for booking.",
      });
    }

    // ==================================================
    // 4. VALIDATE REQUEST AGAINST TOUR CAPACITY
    // ==================================================
if (!tour.maxParticipants || tour.maxParticipants < 1) {

  return errorResponse(res, {
    statusCode: 400,
    message: "This tour does not have a valid participant capacity.",
  });
}
    if (participantCount > tour.maxParticipants) {
      return errorResponse(res, {
        statusCode: 400,
        message: `You can book a maximum of ${tour.maxParticipants} participants for this tour.`,
      });
    }


    const existingBookings = await Booking.aggregate([
      {
        $match: {
          tour: tour._id,
          isDeleted: { $ne: true },

          status: {
            $in: ["pending", "confirmed"],
          },

          travelDate: {
            $gte: selectedTravelDate,
            $lt: new Date(
              selectedTravelDate.getTime() + 24 * 60 * 60 * 1000
            ),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalParticipants: {
            $sum: "$participants",
          },
        },
      },
    ]);

    const bookedParticipants =
      existingBookings.length > 0
        ? existingBookings[0].totalParticipants
        : 0;

    // ==================================================
    // 6. CALCULATE REMAINING CAPACITY
    // ==================================================

    const remainingCapacity =
      tour.maxParticipants - bookedParticipants;

    // ==================================================
    // 7. REJECT IF REQUEST EXCEEDS REMAINING CAPACITY
    // ==================================================

    if (participantCount > remainingCapacity) {
      
      return errorResponse(res, {
        statusCode: 400,
        message:
          remainingCapacity > 0
            ? `Only ${remainingCapacity} participant${
                remainingCapacity === 1 ? "" : "s"
              } remaining for this tour on ${selectedTravelDate.toLocaleDateString(
                "en-PK"
              )}.`
            : "This tour is fully booked for the selected date.",
      });
    }

    const totalAmount = tour.price * participantCount;

    // ==================================================
    // 9. CREATE PENDING BOOKING
    // ==================================================

    const booking = await Booking.create({
      traveler: req.user.id,
      tour: tour._id,
      company: tour.company,
      participants: participantCount,
      totalAmount,
      travelDate: selectedTravelDate,
      status: "pending",
      paymentStatus: "pending",
    });
 // ==================================================
// NOTIFY COMPANY ABOUT NEW BOOKING
// ==================================================

if (booking.company) {
  try {
    const company = await Company.findById(booking.company)
      .select("ownerId");

    if (company?.ownerId) {
      await notificationService.sendToUser(
        company.ownerId,
        {
          title: "New Tour Booking 🎉",

          body: `Someone has booked your tour "${tour.title}".`,

          type: "BOOKING_CREATED",

          extraData: {
            bookingId: booking._id.toString(),
            tourId: tour._id.toString(),
            screen: "company-booking",
          },
        }
      );
    }
  } catch (notificationError) {
    // Notification failure should NOT fail the booking
    console.error(
      "Company booking notification failed:",
      notificationError.message
    );
  }
}
  
    // ==================================================
    // 10. CREATE PAYMENT RECORD
    // ==================================================

    const payment = await Payment.create({
      payer: req.user.id,
      provider,
      purpose: "booking",
      referenceId: booking._id,
      amount: totalAmount,
      currency: "PKR",
      status: "pending",
      companyId: tour.company,
    });

    // ==================================================
    // 11. LINK PAYMENT TO BOOKING
    // ==================================================

    booking.payment = payment._id;

    await booking.save();

    // ==================================================
    // 12. CREATE PAYMENT CHECKOUT
    // ==================================================

    const paymentSession = await paymentManager.createPayment({
      paymentId: payment._id,
      amount: totalAmount,
      provider,
      currency: "PKR",
      title: `Booking for ${tour.title}`,
      userEmail: req.user.email,
    });

    // ==================================================
    // 13. SAVE GATEWAY SESSION
    // ==================================================

    payment.sessionId = paymentSession.sessionId;

    await payment.save();

    // ==================================================
    // 14. JAZZCASH
    // ==================================================

    if (provider === "jazzcash") {
      // Postman testing
      if (
        req.headers.postman ||
        req.headers["user-agent"]?.includes("Postman")
      ) {
        return successResponse(res, {
          statusCode: 201,
          message: "JazzCash payment initiated.",
          data: {
            booking,
            paymentId: payment._id,
            provider: "jazzcash",
            action: paymentSession.action,
            formData: paymentSession.formData,
          },
        });
      }

      // Browser
      return res.send(paymentSession.html);
    }

    // ==================================================
    // 15. STRIPE / EASYPAISA
    // ==================================================

    return successResponse(res, {
      statusCode: 201,
      message:
        "Booking initiated successfully. Please complete payment to confirm.",
      data: {
        booking,
        paymentId: payment._id,
        checkoutUrl: paymentSession.checkoutUrl,
      },
    });
  } catch (error) {
    console.error("Create Booking Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ======================================================
// GET MY BOOKINGS
// ======================================================

const getMyBookings = async (req, res) => {
  try {
    
    // Frontend can then filter them.

    const bookingFilter = {
      traveler: req.user.id,
      isDeleted: { $ne: true },
    };

    const baseQuery = Booking.find(bookingFilter)
      .populate(
        "tour",
        "title destination from to duration price coverImage"
      )
      .populate("company", "name logo")
      .populate(
        "payment",
        "status provider transactionId paidAt amount currency"
      );

    // ==================================================
    // API FEATURES
    // ==================================================

    const features = new ApiFeatures(baseQuery, req.query)
      .search(["status", "paymentStatus"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const bookings = await features.query;

    // ==================================================
    // PAGINATION META
    // ==================================================

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const totalDocuments = await Booking.countDocuments(
      bookingFilter
    );

    return successResponse(res, {
      statusCode: 200,
      message: "Bookings retrieved successfully.",
      data: bookings,
      meta: {
        totalDocuments,
        page,
        limit,
        totalPages: Math.ceil(totalDocuments / limit),
      },
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

// ======================================================
// GET SINGLE BOOKING
// ======================================================

const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      traveler: req.user.id,
      isDeleted: { $ne: true },
    })
      .populate("tour")
      .populate("company", "name email phone address")
      .populate("payment");

    if (!booking) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Booking not found.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Booking details retrieved successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Get Booking By ID Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

// ======================================================
// CANCEL BOOKING
// ======================================================

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      traveler: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!booking) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Booking not found.",
      });
    }

    // ==================================================
    // ALREADY CANCELLED
    // ==================================================

    if (booking.status === "cancelled") {
      return errorResponse(res, {
        statusCode: 400,
        message: "Booking is already cancelled.",
      });
    }

    // ==================================================
    // COMPLETED BOOKINGS CANNOT BE CANCELLED
    // ==================================================

    if (booking.status === "completed") {
      return errorResponse(res, {
        statusCode: 400,
        message: "Completed bookings cannot be cancelled.",
      });
    }

    // ==================================================
    // CANCEL
    // ==================================================

    booking.status = "cancelled";

    await booking.save();

    // ==================================================
    // IMPORTANT
    //
    // We do NOT automatically change paymentStatus here.
    //
    // Example:
    //
    // confirmed + paid
    //        ↓
    // cancelled + paid
    //
    // The refund process will later determine whether
    // paymentStatus becomes "refunded".
    // ==================================================

    return successResponse(res, {
      statusCode: 200,
      message: "Booking cancelled successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);

    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};