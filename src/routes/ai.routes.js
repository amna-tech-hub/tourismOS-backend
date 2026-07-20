const express = require("express");

const router = express.Router();
const aiController = require("../controllers/ai.controller");


router.post('/itineraries',aiController.createItinerary)
module.exports = {
    aiRouter: router
};