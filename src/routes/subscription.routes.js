const express = require("express");
const router = express.Router();
const { createCheckoutSession } = require("../controllers/subscription.controller");
const protect = require("../middleware/authorization.middleware");

router.post("/checkout", protect, createCheckoutSession);

module.exports = router;