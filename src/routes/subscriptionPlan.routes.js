const express = require("express");
const router = express.Router();
const subscriptionPlanController = require("../controllers/subscriptionPlan.controller");
const isAuth = require("../middleware/authorization.middleware"); 
const isrestrictTo=require('../middleware/role.middleware')

router.get("/", subscriptionPlanController.getPlans);
router.post("/",isAuth,isrestrictTo("super_admin"),subscriptionPlanController.createPlan); 

module.exports = router;