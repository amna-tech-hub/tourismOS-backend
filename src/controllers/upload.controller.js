// src/controllers/upload.controller.js
const { successResponse, errorResponse } = require("../utils/response.util");

/**
 * Upload single image
 */
const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please select an image to upload.",
      });
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Image uploaded successfully.",
      data: {
        url: req.file.path,            // Public Cloudinary URL
        public_id: req.file.filename,  // Cloudinary Public ID
      },
    });
  } catch (error) {
    console.error("Upload Single Image Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Failed to upload image.",
    });
  }
};

/**
 * Upload multiple images (e.g., Tour Gallery)
 */
const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please select images to upload.",
      });
    }

    const uploadedImages = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    return successResponse(res, {
      statusCode: 200,
      message: "Images uploaded successfully.",
      data: uploadedImages,
    });
  } catch (error) {
    console.error("Upload Multiple Images Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: error.message || "Failed to upload images.",
    });
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
};