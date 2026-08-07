const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tour.controller");
const aiController = require("../controllers/ai.controller");
const isAuth = require("../middleware/authorization.middleware"); 
const restrictTo = require("../middleware/role.middleware"); 
const checkSafetyController = require("../controllers/check-safety.controller");

// Single Endpoint: Generate Itinerary via AI and Save directly to DB
const imageController=require('../controllers/ai-image.controller');
const checkAICredits = require("../middleware/checkAICredits");
router.post("/generate-cover-image", isAuth,imageController.generateCoverImage);

router.post(
  "/generate-preview",
  isAuth,
  restrictTo("company_admin", "employee","super_admin"),
  checkAICredits(50),
  aiController.generatePreview
);

router.post(
  "/tour-detail",
  isAuth,
  tourController.getTourDetails
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
router.post(
  "/check-safety",
  isAuth,
  checkSafetyController.checkSafety
  
);



module.exports = router;