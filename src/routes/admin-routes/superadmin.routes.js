const express = require("express");
const router = express.Router();
const companyController = require("../../controllers/admin/company-management.controller");
const { createCompanyValidator, updateCompanyValidator,
} = require("../../validators/validator");
const isAuth = require("../../middleware/authorization.middleware");
const restrictTo = require("../../middleware/role.middleware");
router.use(isAuth, restrictTo("super_admin"));

// Company CRUD Routes
router.post( "/companies", createCompanyValidator, companyController.createCompany);
router.get("/companies", companyController.getAllCompanies);
router.get("/companies/:id", companyController.getCompanyById);
router.patch( "/companies/:id", updateCompanyValidator, companyController.updateCompany,
);
router.delete("/companies/:id", companyController.softDeleteCompany);

// Status Management & Stats Routes
router.patch("/companies/:id/suspend", companyController.suspendCompany);
router.patch("/companies/:id/activate", companyController.activateCompany);
router.get("/companies/:id/stats", companyController.getCompanyStats);
router.get("/admin/fraud-attempts", companyController.getFraudAttempts);

module.exports = router;
