const express = require("express");
const router = express.Router();
const bookingController = require("../../controllers/traveler/booking.controller");

const isAuth = require("../../middleware/authorization.middleware"); 
const restrictTo = require("../../middleware/role.middleware"); 
router.use(isAuth, restrictTo("traveler"));

router.post("/bookings", bookingController .createBooking);
router.get("/bookings", bookingController .getMyBookings);
router.get("/bookings/:id", bookingController .getBookingById);
router.delete("/bookings/:id", bookingController .cancelBooking);

module.exports = router;