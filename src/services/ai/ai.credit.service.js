// services/aiCredit.service.js
const Company = require("../../models/Company.model");

const deductAICredits = async (companyId, creditsToDeduct) => {
  const company = await Company.findById(companyId);

  if (!company) {
    throw new Error("Company not found.");
  }

  const remaining = company.aiCredits.total - company.aiCredits.used;

  if (remaining < creditsToDeduct) {
    throw new Error("Insufficient AI credits. Please recharge your balance.");
  }

  // Atomic increment to handle concurrent AI requests safely
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    {
      $inc: { "aiCredits.used": creditsToDeduct },
      $set: { "aiCredits.lastUsedAt": new Date() },
    },
    { new: true }
  );

  return updatedCompany;
};

module.exports = { deductAICredits };