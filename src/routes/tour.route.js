const express = require("express");
const router = express.Router();

const tourController = require("../controllers/tour.controller");
const aiController = require("../controllers/ai.controller");
const isAuth = require("../middleware/authorization.middleware");
const restrictTo = require("../middleware/role.middleware");
const checkSafetyController = require("../controllers/check-safety.controller");
const checkAICredits = require("../middleware/checkAICredits");

const imageController = require("../controllers/ai-image.controller");

// ==========================================
// AI
// ==========================================

router.post(
  "/generate-cover-image",
  isAuth,
  imageController.generateCoverImage
);

router.post(
  "/generate-preview",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  checkAICredits(50),
  aiController.generatePreview
);

// ==========================================
// TOUR DETAILS / SAFETY
// ==========================================

router.post(
  "/tour-detail",
  tourController.getTourDetails
);

router.post(
  "/check-safety",
  isAuth,
  checkSafetyController.checkSafety
);

// ==========================================
// COMPANY / ADMIN TOURS
// IMPORTANT: STATIC ROUTES BEFORE /:id
// ==========================================

router.get(
  "/company",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  tourController.getAllTours
);

// ==========================================
// CREATE TOUR
// ==========================================

router.post(
  "/",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  tourController.createTour
);

// ==========================================
// PUBLIC TOURS
// ==========================================

router.get(
  "/",
  
  tourController.getPublicTours
);

// ==========================================
// DYNAMIC TOUR ROUTES
// Keep these AFTER /company-tour
// ==========================================

router.get(
  "/:id",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  tourController.getTourById
);

router.patch(
  "/:id",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  tourController.updateTour
);

router.patch(
  "/:id/publish",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  tourController.publishTour
);

router.delete(
  "/:id",
  isAuth,
  restrictTo("company_admin", "employee", "super_admin"),
  tourController.deleteTour
);

module.exports = router;