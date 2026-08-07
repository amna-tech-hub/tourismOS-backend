const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");

// Stripe Webhook Endpoint (Requires RAW body middleware)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);
router.post("/jazzcash/callback", paymentController.handleJazzCashCallback);
module.exports = router;