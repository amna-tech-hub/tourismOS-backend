const express = require("express");

const router = express.Router();
const companyController = require('../../controllers/company/company-admin.controller');
const isAuth=require('../../middleware/authorization.middleware')
router.use(isAuth)

const restrictTo=require('../../middleware/role.middleware');
const { updateCompanyProfileValidator } = require("../../validators/validator");
router.get('/profile',restrictTo("company_admin"),companyController.getCompanyProfile)
router.get(
  "/dashboard/credit-history",
  restrictTo("company_admin"),
  companyController.getCreditHistory
);
router.patch("/profile",restrictTo("company_admin"),updateCompanyProfileValidator,companyController.updateCompanyProfile );
router.get("/dashboard",restrictTo("company_admin"),companyController.getCompanyDashboard);
module.exports=router