const imageManager = require("../manager/image.manager.js");
const cloudinaryService = require("../services/cloudinary.service");
const imagePromptBuilder = require("../prompts/image.prompt.js");
const aiCreditService = require("../services/ai.credit.service.js");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model");
const { successResponse, errorResponse } = require("../utils/response.util");

const IMAGE_CREDIT_COST = 20;

// Helper to resolve company for AI credits check
const getCompanyForUser = async (user) => {
  if (user.role === "super_admin") return null;
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

// Main endpoint called when user enters a prompt and clicks "Generate by AI"
const generateCoverImage = async (req, res) => {
  try {
    const { prompt: userPrompt } = req.body;

    if (!userPrompt || !userPrompt.trim()) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please provide a prompt describing the image you want to generate.",
      });
    }

    const isSuperAdmin = req.user.role === "super_admin";
    const company = await getCompanyForUser(req.user);

    if (!isSuperAdmin && !company) {
      return errorResponse(res, {
        statusCode: 404,
        message: "Associated company profile not found.",
      });
    }

    // 1. AI CREDIT PRE-CHECK (20 credits per image call via Service)
    if (!isSuperAdmin && company) {
      const creditCheck = await aiCreditService.checkCredits(company._id, IMAGE_CREDIT_COST);

      if (!creditCheck.hasEnough) {
        return errorResponse(res, {
          statusCode: 402,
          message: `Insufficient AI credits. You have ${creditCheck.remaining} remaining, but ${IMAGE_CREDIT_COST} credits are required.`,
          data: {
            purchaseRequired: true,
            required: IMAGE_CREDIT_COST,
            remaining: creditCheck.remaining,
          },
        });
      }
    }

    // 2. ENHANCE USER PROMPT
    const enhancedPrompt = imagePromptBuilder.buildCustomImagePrompt(userPrompt);

    // 3. GENERATE IMAGE VIA IMAGE MANAGER (Pollinations -> Flux -> Gemini Image)
    const aiResult = await imageManager.generateImage(enhancedPrompt);
    console.log(aiResult, " aiResult from image-controller");

    if (!aiResult.success || !aiResult.buffer) {
      return errorResponse(res, {
        statusCode: aiResult.error?.status || 500,
        message: aiResult.error?.message || "Failed to generate AI image.",
      });
    }
    console.log(aiResult.buffer?.length, "buffer length of aiResult");

    // 4. UPLOAD BUFFER DIRECTLY TO CLOUDINARY
    const cloudinaryResult = await cloudinaryService.uploadBuffer(
      aiResult.buffer,
      "TourismOS/CoverImages"
    );
    console.log(cloudinaryResult, "cloudinary result");

    // 5. DEDUCT AI CREDITS & WRITE AUDIT LEDGER
    let remainingCredits = null;
    if (!isSuperAdmin && company) {
      const deductionResult = await aiCreditService.deductCredits({
        companyId: company._id,
        credits: IMAGE_CREDIT_COST,
        description: `Generated AI Cover Image for prompt: "${userPrompt.trim().substring(0, 50)}..."`,
      });
      remainingCredits = deductionResult.remaining;
    }

    // 6. RETURN CLOUDINARY URL & PUBLIC_ID TO FRONTEND
    return successResponse(res, {
      statusCode: 200,
      message: "AI image generated and uploaded successfully.",
      data: {
        coverImage: {
          url: cloudinaryResult.url,
          public_id: cloudinaryResult.public_id,
        },
        provider: aiResult.provider,
        model: aiResult.model,
        creditsDeducted: isSuperAdmin ? 0 : IMAGE_CREDIT_COST,
        remainingCredits,
      },
    });
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "An unexpected error occurred during image generation.",
    });
  }
};

module.exports = {
  generateCoverImage,
};