const { body, param, query, validationResult } = require("express-validator");

// Helper middleware to handle validation results
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      // Maps the errors into a clean, readable format for the frontend
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// Validation Rules for Registration
const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+92|0)?3[0-9]{9}$/)
    .withMessage(
      "Please enter a valid Pakistani mobile number (e.g., 03001234567 or +923001234567)."
    ),

  body("gender")
    .optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"])
    .withMessage("Invalid gender option selected."),

  validateResults,
];

// Validation Rules for Login
const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required."),

  validateResults,
];

// Validation Rules for Reset Password
const resetPasswordValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP verification code is required.")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits.")
    .isNumeric()
    .withMessage("OTP must contain only numbers."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long."),

  validateResults,
];

// Create Company Validation Rules
const createCompanyValidator = [
  body("companyName")
    .trim()
    .notEmpty()
    .withMessage("Company name is required.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Company email is required.")
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+92|0)?3[0-9]{9}$/)
    .withMessage(
      "Please enter a valid Pakistani mobile number (e.g., 03001234567 or +923001234567)."
    ),

  body("address").optional({ checkFalsy: true }).trim(),

  validateResults,
];

//  Update Company Validation Rules (Super Admin)
const updateCompanyValidator = [
  body("companyName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Company name cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters."),

  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+92|0)?3[0-9]{9}$/)
    .withMessage("Please enter a valid Pakistani mobile number."),

  body("address").optional({ checkFalsy: true }).trim(),

  validateResults,
];

// Accept Invitation Validator
const acceptInvitationValidator = [
  body("token").trim().notEmpty().withMessage("Invitation token is required."),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),

  validateResults,
];

//  Update Company Profile Validation Rules (Company Admin Profile Update)
const updateCompanyProfileValidator = [
  body("companyName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Company name cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Company name must be between 2 and 100 characters."),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^(\+92|0)?3[0-9]{9}$/)
    .withMessage("Please enter a valid phone number."),

  body("address").optional({ checkFalsy: true }).trim(),

  body("logo").optional({ checkFalsy: true }).trim().isURL().withMessage("Logo must be a valid URL."),

  body("description")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters."),

  validateResults,
];

// Employee Validation Rules
const inviteEmployeeValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("Employee email is required.")
    .isEmail().withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("designation")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Designation must be between 2 and 50 characters."),

  body("department")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Department must be between 2 and 50 characters."),

  validateResults
];

const updateEmployeeValidator = [
  param("id")
    .isMongoId().withMessage("Invalid employee ID format."),

  body("designation")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Designation must be between 2 and 50 characters."),

  body("department")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Department must be between 2 and 50 characters."),

  body("status")
    .optional()
    .isIn(["active", "inactive"]).withMessage("Status must be either active or inactive."),

  validateResults
];
module.exports = {
  registerValidator,
  loginValidator,
  resetPasswordValidator,
  createCompanyValidator,
  updateCompanyValidator,
  acceptInvitationValidator,
  updateCompanyProfileValidator,
  inviteEmployeeValidator,
  updateEmployeeValidator
};