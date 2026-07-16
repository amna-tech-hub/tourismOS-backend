// middlewares/validator.js
const { body, validationResult } = require("express-validator");

// Helper middleware to handle validation results
const validateResults = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            // Maps the errors into a clean, readable format for the frontend
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// 1. Validation Rules for Registration
const registerValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("Name is required.")
        .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters."),
    
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required.")
        .isEmail().withMessage("Please provide a valid email address.")
        .normalizeEmail(), // Sanitizes email (e.g., lowercase, trims)

    body("password")
        .notEmpty().withMessage("Password is required.")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long."),

    body("phone")
        .optional({ checkFalsy: true }) // Phone is optional, but if provided, validate it
        .trim()
        .matches(/^(\+92|0)?3[0-9]{9}$/)
        .withMessage("Please enter a valid Pakistani mobile number (e.g., 03001234567 or +923001234567)."),

    body("gender")
        .optional()
        .isIn(["male", "female", "other", "prefer_not_to_say"])
        .withMessage("Invalid gender option selected."),

    validateResults // 👈 Processes the validation rules above
];

// 2. Validation Rules for Login
const loginValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required.")
        .isEmail().withMessage("Please provide a valid email address.")
        .normalizeEmail(),

    body("password")
        .notEmpty().withMessage("Password is required."),

    validateResults
];

// 3. Validation Rules for Reset Password
const resetPasswordValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required.")
        .isEmail().withMessage("Please provide a valid email address.")
        .normalizeEmail(),

    body("otp")
        .trim()
        .notEmpty().withMessage("OTP verification code is required.")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits.")
        .isNumeric().withMessage("OTP must contain only numbers."),

    body("newPassword")
        .notEmpty().withMessage("New password is required.")
        .isLength({ min: 6 }).withMessage("New password must be at least 6 characters long."),

    validateResults
];

module.exports = {
    registerValidator,
    loginValidator,
    resetPasswordValidator
};