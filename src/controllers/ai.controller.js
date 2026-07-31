const promptBuilder = require("../prompts/prompt.builder");
const aiManager = require("../manager/ai.manager");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model");
const { successResponse, errorResponse } = require("../utils/response.util");

// Helper to resolve company profile
const getCompanyForUser = async (user) => {
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
    const { title, destination, duration, price, maxParticipants, budget, interests } = req.body;

    if (!title || !destination || !duration || !price || !maxParticipants) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Title, destination, duration, price, and maxParticipants are required.",
      });
    }

    const company = await getCompanyForUser(req.user);
    if (!company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // ==========================================
    // 1. AI CREDIT PRE-CHECK
    // ==========================================
    const ESTIMATED_CREDIT_COST = 50; // Set credit cost per AI generation call

    const totalCredits = company.aiCredits?.total || 0;
    const usedCredits = company.aiCredits?.used || 0;
    const remainingCredits = totalCredits - usedCredits;

    if (remainingCredits < ESTIMATED_CREDIT_COST) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Insufficient AI credits. You have ${Math.max(0, remainingCredits)} credits remaining, but this action requires ${ESTIMATED_CREDIT_COST}.`,
      });
    }

    // 1. Build prompt and call AI Manager
    const prompt = promptBuilder.buildTravelPlanPrompt({
      destination,
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

    // 2. Extract content string
    let aiText = rawResult.content || rawResult.data || rawResult.text || "";

    if (typeof aiText === "object") {
      aiText = JSON.stringify(aiText);
    }

    // 3. Clean and isolate JSON string
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

    // ==========================================
    // 2. AI CREDIT DEDUCTION (Executes only on success)
    // ==========================================
    await Company.findByIdAndUpdate(company._id, {
      $inc: { "aiCredits.used": ESTIMATED_CREDIT_COST },
      $set: { "aiCredits.lastUsedAt": new Date() },
    });

    // 4. Safe key extraction
    const parsedItinerary = aiData.itinerary || aiData.data?.itinerary || [];
    const parsedBudget = aiData.budgetBreakdown || aiData.data?.budgetBreakdown || {};
    const parsedTips = aiData.travelTips || aiData.data?.travelTips || [];
    const parsedBestTime = aiData.bestTimeToVisit || aiData.data?.bestTimeToVisit || "";
    const parsedNotes = aiData.importantNotes || aiData.data?.importantNotes || [];

    // 5. Return preview payload 
    return successResponse(res, {
      statusCode: 200,
      message: "AI tour itinerary preview generated successfully.",
      data: {
        company: company._id,
        createdBy: req.user.id,
        title,
        description: req.body.description || `AI-generated tour package for ${destination}`,
        destination,
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