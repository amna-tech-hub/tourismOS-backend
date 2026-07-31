const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tour.controller");
const aiController = require("../controllers/ai.controller");
const isAuth = require("../middleware/authorization.middleware"); 
const restrictTo = require("../middleware/role.middleware"); 
// Single Endpoint: Generate Itinerary via AI and Save directly to DB
router.post(
  "/generate-preview",
  isAuth,
  restrictTo("company_admin", "employee","super_admin"),
  aiController.generatePreview
);

// Standard CRUD Endpoints
router.post(
  "/",
  isAuth,
  restrictTo("company_admin", "employee","super_admin"),
  tourController.createTour
);
// all tours of specific company(company specific)
router.get(
  "/company-tour",
  isAuth,
  restrictTo("company_admin", "employee","super_admin"),
  tourController.getAllTours
);
//all tours for frontend showcase
router.get(
  "/",
  isAuth,
  tourController.getPublicTours
);

router.get(
  "/:id",
  isAuth,
  restrictTo("company_admin", "employee"),
  tourController.getTourById
);

router.patch(
  "/:id",
  isAuth,
  restrictTo("company_admin", "employee"),
  tourController.updateTour
);

router.delete(
  "/:id",
  isAuth,
  restrictTo("company_admin", "employee","super_admin"),
  tourController.deleteTour
);

module.exports = router;