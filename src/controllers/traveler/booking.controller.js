const Booking = require("../../models/Booking.model");
const Tour = require("../../models/Tour.model");
const Payment = require("../../models/Payment.model");
const paymentManager = require("../../manager/payment.manager");
const { successResponse, errorResponse } = require("../../utils/response.util");
const ApiFeatures = require("../../utils/apiFeatures.util");

// Create Booking & Initiate Payment
// Create Booking & Initiate Payment
const createBooking = async (req, res) => {
  try {
    const { tourId, participants = 1, travelDate, provider = "jazzcash" } = req.body;

    // 1. Validate Tour
    const tour = await Tour.findOne({ _id: tourId, isDeleted: { $ne: true } });
    if (!tour) {
      return errorResponse(res, { statusCode: 404, message: "Tour not found." });
    }

    if (tour.status !== "published") {
      return errorResponse(res, {
        statusCode: 400,
        message: "This tour is currently not available for booking.",
      });
    }

    // 2. Validate Capacity
    if (participants > tour.maxParticipants) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Participants exceed maximum tour capacity of ${tour.maxParticipants}.`,
      });
    }

    // 3. Calculate Total Amount securely on server
    const totalAmount = tour.price * participants;

    // 4. Create Initial Pending Booking
    const booking = await Booking.create({
      traveler: req.user.id,
      tour: tour._id,
      company: tour.company,
      participants,
      totalAmount,
      travelDate,
      status: "pending",
      paymentStatus: "pending",
    });

    // 5. Create Generic Payment Record
    const payment = await Payment.create({
      payer: req.user.id,
      provider: provider,
      purpose: "booking",
      referenceId: booking._id,
      amount: totalAmount,
      currency: "PKR",
      status: "pending",
      companyId: tour.company,
    });

    // 6. Link Payment ID back to Booking
    booking.payment = payment._id;
    await booking.save();

    // 7. Generate Payment Gateway Checkout
    const paymentSession = await paymentManager.createPayment({
      paymentId: payment._id,
      amount: totalAmount,
      provider: provider,
      currency: "PKR",
      title: `Booking for ${tour.title}`,
      userEmail: req.user.email,
    });

    // 8. Store Gateway Session ID on Payment Record
    payment.sessionId = paymentSession.sessionId;
    await payment.save();

    // 9. Handle JazzCash differently - return HTML for auto-submission
    if (provider === "jazzcash") {
      // For Postman testing: Return JSON with form data
      if (req.headers.postman || req.headers['user-agent']?.includes('Postman')) {
        return successResponse(res, {
          statusCode: 201,
          message: "JazzCash payment initiated",
          data: {
            booking,
            paymentId: payment._id,
            provider: "jazzcash",
            action: paymentSession.action,
            formData: paymentSession.formData,
          },
        });
      }

      // For browser: Return HTML form that auto-submits
      return res.send(paymentSession.html);
    }

    // 10. For Stripe/Easypaisa - return checkout URL
    return successResponse(res, {
      statusCode: 201,
      message: "Booking initiated successfully. Please complete payment to confirm.",
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

// Get Traveler's Own Bookings
const getMyBookings = async (req, res) => {
  try {
    // 1. Base query scoped to the logged-in traveler
    const baseQuery = Booking.find({
      traveler: req.user.id,
      isDeleted: { $ne: true },
      status:"confirmed"
      ,
    })
      .populate("tour", "title destination duration price coverImage")
      .populate("company", "name logo")
      .populate("payment", "status provider transactionId paidAt");

    // 2. Count total documents for pagination metadata
    const totalDocuments = await Booking.countDocuments({
      traveler: req.user.id,
      isDeleted: { $ne: true },
    });

    // 3. Apply ApiFeatures chain
    const features = new ApiFeatures(baseQuery, req.query)
      .search(["status"])
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // 4. Execute final query
    const bookings = await features.query;

    return successResponse(res, {
      statusCode: 200,
      message: "Bookings retrieved successfully.",
      data: bookings,
      meta: {
        totalDocuments,
      },
    });
  } catch (error) {
    console.error("Get My Bookings Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};

// Get Single Booking Details
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
      return errorResponse(res, { statusCode: 404, message: "Booking not found." });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Booking details retrieved successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Get Booking By ID Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};

// Cancel Booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      traveler: req.user.id,
      isDeleted: { $ne: true },
    });

    if (!booking) {
      return errorResponse(res, { statusCode: 404, message: "Booking not found." });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return errorResponse(res, {
        statusCode: 400,
        message: `Cannot cancel a booking that is already ${booking.status}.`,
      });
    }

    booking.status = "cancelled";
    await booking.save();

    return successResponse(res, {
      statusCode: 200,
      message: "Booking cancelled successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    return errorResponse(res, { statusCode: 500, message: "Internal Server Error" });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};