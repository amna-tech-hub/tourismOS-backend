const geocodingService = require("../services/geocoding/geocoding.service");
const weatherService = require("../services/safety/weather.service");
const disasterService = require("../services/safety/disaster.service");
const safetyService = require("../services/safety/safety.service");
const notificationService = require("../services/notification/notification.service");
// =====================================================
// SEND SAFETY ALERT NOTIFICATIONS
// =====================================================

const sendSafetyNotifications = async ({
  tour,
  safetyReport,
}) => {
  try {
    const status = safetyReport.status;

    const isNotSafe = status === "NOT_SAFE";

    const title = isNotSafe
      ? "🚨 Safety Alert"
      : "⚠️ Safety Warning";

    const body = isNotSafe
      ? `A serious safety alert has been issued for your tour "${tour.title}". Please review the latest safety conditions.`
      : `A safety warning has been issued for your tour "${tour.title}". Please review the latest safety conditions.`;

    // =================================================
    // 1. FIND COMPANY
    // =================================================

    const company = await Company.findOne({
      _id: tour.company,
      isDeleted: false,
    });

    // =================================================
    // 2. NOTIFY COMPANY OWNER
    // =================================================

    if (company?.ownerId) {
      await notificationService.sendToUser(
        company.ownerId,
        {
          title,
          body,

          type: "SAFETY_ALERT",

          extraData: {
            tourId: tour._id.toString(),
            status,
            screen: "tour-safety",
          },
        }
      );
    }

    // =================================================
    // 3. FIND ADMIN USERS
    // =================================================

    const admins = await User.find({
      role: "super_admin",
      isDeleted: { $ne: true },
    }).select("_id");

    // =================================================
    // 4. NOTIFY ADMINS
    // =================================================

    for (const admin of admins) {
      await notificationService.sendToUser(
        admin._id,
        {
          title,
          body,

          type: "SAFETY_ALERT",

          extraData: {
            tourId: tour._id.toString(),
            companyId:
              company?._id?.toString(),
            status,
            screen: "tour-safety",
          },
        }
      );
    }

    // =================================================
    // 5. FIND TRAVELERS WHO BOOKED THIS TOUR
    // =================================================

    const bookings = await Booking.find({
      tour: tour._id,

      status: {
        $in: [
          "pending",
          "confirmed",
        ],
      },

      isDeleted: {
        $ne: true,
      },
    }).select("traveler");
console.log(bookings," all booked user of the tour that give warning");


    // =================================================
    // 6. REMOVE DUPLICATE TRAVELERS
    // =================================================

    const travelerIds = [
      ...new Set(
        bookings
          .map((booking) =>
            booking.traveler?.toString()
          )
          .filter(Boolean)
      ),
    ];

    // =================================================
    // 7. NOTIFY TRAVELERS
    // =================================================
console.log(travelerIds," all ids");

    for (const travelerId of travelerIds) {
      await notificationService.sendToUser(
        travelerId,
        {
          title,
          body,

          type: "SAFETY_ALERT",

          extraData: {
            tourId: tour._id.toString(),
            status,
            screen: "booking",
          },
        }
      );
    }

    console.log(
      `🔔 Safety notifications sent for tour ${tour._id}`
    );

  } catch (error) {
    console.error(
      "Safety Notification Error:",
      error
    );
  }
};
exports.checkSafety = async (req, res) => {
  try {
    let {
      tourId,
      locationName,
      latitude,
      longitude,
    } = req.body;

    let coords = null;

    // =====================================================
    // 1. GET TOUR
    // =====================================================

    let tour = null;

    if (tourId) {
      tour = await Tour.findOne({
        _id: tourId,
        isDeleted: { $ne: true },
      });

      if (!tour) {
        return res.status(404).json({
          error: "Tour not found.",
        });
      }
    }

    // =====================================================
    // 2. GET COORDINATES
    // =====================================================

    if (latitude != null && longitude != null) {
      coords = {
        latitude,
        longitude,
      };
    } else if (locationName) {
      coords =
        await geocodingService.geocodeLocation(
          locationName
        );
    }

    if (!coords) {
      return res.status(400).json({
        error:
          "Please provide valid locationName or coordinates",
      });
    }

    // =====================================================
    // 3. FETCH WEATHER + DISASTERS
    // =====================================================

    const [weatherList, disasters] =
      await Promise.all([
        weatherService.getBatchWeather([coords]),
        disasterService.getDisasters(
          coords.latitude,
          coords.longitude
        ),
      ]);

    const weather =
      weatherList && weatherList.length > 0
        ? weatherList[0]
        : null;

    // =====================================================
    // 4. EVALUATE SAFETY
    // =====================================================

    const safetyReport =
      safetyService.evaluateSafety(
        weather,
        disasters
      );

    // =====================================================
    // 5. SEND SAFETY NOTIFICATIONS
    // =====================================================

    if (
      tour &&
      safetyReport.status !== "SAFE"
    ) {
      await sendSafetyNotifications({
        tour,
        safetyReport,
      });
    }

    // =====================================================
    // 6. RESPONSE
    // =====================================================

    return res.json({
      location:
        locationName || "Custom Coordinates",

      coordinates: coords,

      weather,

      disasters,

      safetyReport,
    });

  } catch (error) {
    console.error(
      "Safety Check Error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Failed to check safety.",
    });
  }
};