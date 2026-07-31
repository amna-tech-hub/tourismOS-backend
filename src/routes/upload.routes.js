// src/routes/upload.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware"); // Your middleware
const uploadController = require("../controllers/upload.controller");
const isAuth = require("../middleware/authorization.middleware");

// Upload single image (e.g. Cover Image)
router.post(
  "/single",
  isAuth,
  upload.single("image"), // Expects field name "image"
  uploadController.uploadSingleImage
);

// Upload up to 5 images (e.g. Tour Gallery)
router.post(
  "/multiple",
  isAuth,
  upload.array("images", 5), // Expects field name "images", max 5 files
  uploadController.uploadMultipleImages
);

module.exports = router;