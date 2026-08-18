const express = require("express");
const router = express.Router();
const protect = require("../middleware/authorization.middleware");
const restrictTo= require("../middleware/role.middleware"); // Adjust path if needed
const subscriptionPlanController = require("../controllers/subscriptionPlan.controller");
const subscriptionController = require("../controllers/subscription.controller");

// =========================================================
// PUBLIC & COMPANY USER ROUTES
// =========================================================

// Public / Company: Get Active Plans for Pricing Page
router.get("/plans", subscriptionPlanController.getPlans);

// Protected (Company): Create Checkout Session
router.post(
  "/checkout",
  protect,
  subscriptionController.createCheckoutSession
);

// =========================================================
// SUPER ADMIN EXCLUSIVE ROUTES
// =========================================================

// Super Admin: Create Plan
router.post(
  "/admin/plans",
  protect,
  restrictTo("super_admin"),
  subscriptionPlanController.createPlan
);

// Super Admin: Get All Plans (Active + Inactive)
router.get(
  "/admin/plans",
  protect,
  restrictTo("super_admin"),
  subscriptionPlanController.getAllPlansAdmin
);

// Super Admin: Update Subscription Plan
router.put(
  "/admin/plans/:id",
  protect,
  restrictTo("super_admin"),
  subscriptionPlanController.updatePlan
);

// Super Admin: Toggle Plan Active Status (Archive / Activate)
router.patch(
  "/admin/plans/:id/toggle",
  protect,
  restrictTo("super_admin"),
  subscriptionPlanController.togglePlanStatus
);

// Super Admin: Get Company Subscriptions Ledger & Revenue Stats
router.get(
  "/admin/company-subscriptions",
  protect,
  restrictTo("super_admin"),
  subscriptionPlanController.getCompanySubscriptions
);

module.exports = router;