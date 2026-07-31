const express = require("express");
const router = express.Router();

const companyBookingController = require('../../controllers/company/booking.controller');
const isAuth=require('../../middleware/authorization.middleware')
const restrictTo=require('../../middleware/role.middleware')
router.use(isAuth, restrictTo("company_admin", "employee"));

router.get("/",companyBookingController .getCompanyBookings);
router.patch("/:id",companyBookingController .updateBookingStatus);

module.exports = router;