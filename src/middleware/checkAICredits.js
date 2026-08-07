const aiCreditService = require("../services/ai.credit.service");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model"); 


const checkAICredits = (requiredCredits) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const userRole = req.user?.role;

      //  Super Admin Bypass
      if (userRole === "super_admin") {
        req.isSuperAdmin = true;
        return next();
      }

      let companyId = null;

      // Resolve Company ID based on role
      if (userRole === "company_admin") {
        // Company Admin owns the company
        const company = await Company.findOne({ ownerId: userId }).select("_id");
        companyId = company?._id;
      } else {
        // Employee: Look up in Employee collection where user matches req.user.id
        const employeeProfile = await Employee.findOne({ 
          user: userId, 
          status: "active" 
        }).select("company");

        companyId = employeeProfile?.company;
      }

      //  Fallback check if user object already had companyId attached directly
      if (!companyId && req.user?.company) {
        companyId = req.user.company;
      }

      // Validate company context
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "No active company profile found associated with this user.",
        });
      }

      //  Verify Credit Balance
      const creditCheck = await aiCreditService.checkCredits(companyId, requiredCredits);

      if (!creditCheck.hasEnough) {
        return res.status(402).json({
          success: false,
          message: "Insufficient AI Credits",
          required: requiredCredits,
          remaining: creditCheck.remaining,
          purchaseRequired: true,
        });
      }

      // Attach resolved company ID & credit info to request object
      req.companyId = companyId;
      req.aiCredits = creditCheck;

      next();
    } catch (error) {
      console.error("AI Credit Middleware Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to verify AI credit balance" 
      });
    }
  };
};

module.exports = checkAICredits;