const Company = require("../models/Company.model");
const AICreditTransaction = require("../models/AICreditTransaction.model");

class AICreditService {
 
  async checkCredits(companyId, requiredCredits) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const total = company.aiCredits?.total || 0;
    const used = company.aiCredits?.used || 0;
    const remaining = total - used;

    return {
      hasEnough: remaining >= requiredCredits,
      remaining,
      total,
      used,
    };
  }


  async addCredits({ companyId, credits, type = "subscription", referenceId, description }) {
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $inc: { "aiCredits.total": credits } },
      { new: true }
    );

    const remaining = updatedCompany.aiCredits.total - updatedCompany.aiCredits.used;

    // Log to Audit Ledger
    await AICreditTransaction.create({
      company: companyId,
      type,
      credits: Math.abs(credits),
      balanceAfter: remaining,
      referenceId,
      description,
    });

    return { remaining, company: updatedCompany };
  }

  /**
   * Deduct credits (e.g., after successful AI generation)
   */
  async deductCredits({ companyId, credits, referenceId, description }) {
    const check = await this.checkCredits(companyId, credits);
    if (!check.hasEnough) {
      throw new Error(`Insufficient AI Credits. Required: ${credits}, Available: ${check.remaining}`);
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $inc: { "aiCredits.used": credits } },
      { new: true }
    );

    const remaining = updatedCompany.aiCredits.total - updatedCompany.aiCredits.used;

    // Log to Audit Ledger
    await AICreditTransaction.create({
      company: companyId,
      type: "usage",
      credits: -Math.abs(credits),
      balanceAfter: remaining,
      referenceId,
      description,
    });

    return { remaining, company: updatedCompany };
  }
}

module.exports = new AICreditService();