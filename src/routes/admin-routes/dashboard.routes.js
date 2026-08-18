const express = require("express");

const dashboardController = require("../../controllers/admin/dashboard.controller");
const analysisController = require("../../controllers/admin/analysis.controller");
const isAuth =require('../../middleware/authorization.middleware')
const restrictTo =require('../../middleware/role.middleware')
const adminTourController=require('../../controllers/admin/adminTour.controller')

const router = express.Router();

router.get("/revenue",isAuth,restrictTo("super_admin"),dashboardController.getRevenueTrend);
router.get("/company-overview",isAuth,restrictTo("super_admin"),dashboardController.getCompanyOverview);
router.get("/booking-overview",isAuth,restrictTo("super_admin"),dashboardController.getBookingOverview);
router.get("/platform-stats",isAuth,restrictTo("super_admin"),dashboardController.getPlatformStats);
router.get("/platform-analysis",isAuth,restrictTo("super_admin"),analysisController.getPhase1Analytics);
router.get("/tours/analytics", adminTourController.getTourAnalytics);
router.delete("/tours/reviews/:reviewId", adminTourController.deleteReviewAdmin);
module.exports = router;