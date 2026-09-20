const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../../controllers/employee/employeeDashboard.controller");
const {
  getMyTourBookings,
  getBookingDetails,
  getBookingStats,
} = require("../../controllers/employee/employeeBooking.controller");
const {
  getMyProfile,
  updateMyProfile,
  getMyCompany,
} = require("../../controllers/employee/employeeProfile.controller");
const 
employeeTourController
 = require("../../controllers/employee/employeeTour.controller");
const {
  getMyTourReviews,
  getRatingStats,
} = require("../../controllers/employee/employeeReview.controller");

const isAuth = require("../../middleware/authorization.middleware");
const restrictTo = require("../../middleware/role.middleware");
router.use(isAuth);
router.use(restrictTo("employee"));

router.get("/dashboard/stats", getDashboardStats);
// booking
router.get("/bookings", getMyTourBookings);
router.get("/bookings/stats", getBookingStats);
router.get("/bookings/:id", getBookingDetails);
// reviews
router.get("/reviews", getMyTourReviews);
router.get("/reviews/stats", getRatingStats);

// tours
router.post("/tours", employeeTourController.createMyTour);

router.get("/tours", employeeTourController.getMyTours);

router.get("/tours/:id", employeeTourController.getMyTourById);

router.post("/tours/details", employeeTourController.getMyTourDetails);

router.put("/tours/:id", employeeTourController.updateMyTour);

router.patch("/tours/:id/publish", employeeTourController.publishMyTour);

router.delete("/tours/:id", employeeTourController.deleteMyTour);

// profile
router.get("/profile/company", getMyCompany);
router.get("/profile", getMyProfile);
router.patch("/profile", updateMyProfile);

module.exports = router;
