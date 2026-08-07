const promptBuilder = require("../prompts/prompt.builder");
const aiManager = require("../manager/ai.manager");
const aiCreditService = require("../services/ai.credit.service");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model");
const { successResponse, errorResponse } = require("../utils/response.util");

const ITINERARY_CREDIT_COST = 50;

// Helper to resolve company profile
const getCompanyForUser = async (user) => {
  console.log("came inside get company");
  
  if (user.role === "super_admin") {
    return null; // Super Admin does not require a company association
  }
  if (user.role === "company_admin") {
    return await Company.findOne({ ownerId: user.id, isDeleted: false });
  }
  if (user.role === "employee") {
    const employee = await Employee.findOne({ user: user.id, isDeleted: { $ne: true } });
    if (!employee) return null;
    return await Company.findOne({ _id: employee.company, isDeleted: false });
  }
  return null;
};

// Helper function to extract JSON object from AI string
const extractJsonString = (rawText) => {
  if (!rawText) return "";
  
  // 1. Strip markdown fences
  let cleaned = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // 2. Locate first '{' and last '}' to strip leading/trailing conversational text
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned;
};

const generatePreview = async (req, res) => {
  try {
    const { title, from, to, duration, price, maxParticipants, budget, interests } = req.body;
    console.log(req.body, " preview request");

    if (!title || !from || !to || !duration || !price || !maxParticipants) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Title, from, to, duration, price, and maxParticipants are required.",
      });
    }

    const isSuperAdmin = req.user.role === "super_admin";
    const company = await getCompanyForUser(req.user);
    console.log("after company", company);

    // Require company profile ONLY IF the user is NOT a super_admin
    if (!isSuperAdmin && !company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // 1. AI CREDIT PRE-CHECK (Skip for Super Admin)
    if (!isSuperAdmin && company) {
      const creditCheck = await aiCreditService.checkCredits(company._id, ITINERARY_CREDIT_COST);

      if (!creditCheck.hasEnough) {
        return errorResponse(res, {
          statusCode: 402,
          message: `Insufficient AI credits. You have ${creditCheck.remaining} credits remaining, but this action requires ${ITINERARY_CREDIT_COST}.`,
          data: {
            purchaseRequired: true,
            required: ITINERARY_CREDIT_COST,
            remaining: creditCheck.remaining,
          },
        });
      }
    }

    // 2. Build prompt and call AI Manager
    const prompt = promptBuilder.buildTravelPlanPrompt({
      from,
      to,
      duration,
      budget: budget || price,
      interests,
    });

    const rawResult = await aiManager.generate(prompt);

    if (!rawResult || !rawResult.success) {
      return errorResponse(res, {
        statusCode: 500,
        message: rawResult?.error?.message || "AI Provider failed to generate content.",
      });
    }

    // 3. Extract content string
    let aiText = rawResult.content || rawResult.data || rawResult.text || "";

    if (typeof aiText === "object") {
      aiText = JSON.stringify(aiText);
    }

    // 4. Clean and isolate JSON string
    const cleanedJsonString = extractJsonString(aiText);

    let aiData;
    try {
      aiData = JSON.parse(cleanedJsonString);
    } catch (err) {
      console.error("--- AI RAW OUTPUT START ---");
      console.error(aiText);
      console.error("--- AI RAW OUTPUT END ---");
      
      return errorResponse(res, {
        statusCode: 500,
        message: "AI output could not be parsed into valid JSON. Check console logs for raw text.",
      });
    }

    // 5. CREDIT DEDUCTION & AUDIT TRANSACTION LOGGING (Skip for Super Admin)
    let remainingCredits = null;
    if (!isSuperAdmin && company) {
      const deductionResult = await aiCreditService.deductCredits({
        companyId: company._id,
        credits: ITINERARY_CREDIT_COST,
        description: `Generated AI Tour Preview for "${title}" (${from} to ${to})`,
      });
      remainingCredits = deductionResult.remaining;
    }

    // 6. Safe key extraction
    const parsedItinerary = aiData.itinerary || aiData.data?.itinerary || [];
    const parsedBudget = aiData.budgetBreakdown || aiData.data?.budgetBreakdown || {};
    const parsedTips = aiData.travelTips || aiData.data?.travelTips || [];
    const parsedBestTime = aiData.bestTimeToVisit || aiData.data?.bestTimeToVisit || "";
    const parsedNotes = aiData.importantNotes || aiData.data?.importantNotes || [];
    const parsedFaqs = aiData.faqs || aiData.data?.faqs || [];

    // 7. Return preview payload 
    return successResponse(res, {
      statusCode: 200,
      message: "AI tour itinerary preview generated successfully.",
      data: {
        company: company ? company._id : null,
        createdBy: req.user.id,
        title,
        description: req.body.description || `AI-generated tour package from ${from} to ${to}`,
        from,
        to,
        duration,
        price,
        maxParticipants,
        status: req.body.status || "draft",

        // AI Generated Fields
        itinerary: parsedItinerary,
        budgetBreakdown: parsedBudget,
        travelTips: parsedTips,
        bestTimeToVisit: parsedBestTime,
        importantNotes: parsedNotes,
        faqs: parsedFaqs,

        // Balance Metadata for Frontend
        remainingCredits,
      },
    });
  } catch (error) {
    console.error("Generate Preview Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  generatePreview,
};