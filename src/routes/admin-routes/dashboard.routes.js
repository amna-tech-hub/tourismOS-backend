const express = require("express");

const dashboardController = require("../../controllers/admin/dashboard.controller");
const isAuth =require('../../middleware/authorization.middleware')
const restrictTo =require('../../middleware/role.middleware')

const router = express.Router();

router.get("/revenue",isAuth,restrictTo("super_admin"),dashboardController.getRevenueTrend);
router.get("/company-overview",isAuth,restrictTo("super_admin"),dashboardController.getCompanyOverview);
router.get("/booking-overview",isAuth,restrictTo("super_admin"),dashboardController.getBookingOverview);
router.get("/platform-stats",isAuth,restrictTo("super_admin"),dashboardController.getPlatformStats);

module.exports = router;