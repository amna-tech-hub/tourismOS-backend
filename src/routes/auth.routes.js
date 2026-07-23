const express = require("express");

const router = express.Router();

const authController = require("../controllers/auth.controller");
const { otpLimiter, loginLimiter } = require("../middleware/rateLimiter");
const { registerValidator, loginValidator, resetPasswordValidator, acceptInvitationValidator } = require("../validators/validator");

router.post("/register",otpLimiter, registerValidator,authController.register);

// Route to verify the user-submitted OTP
router.post('/verify-otp',authController.verifyOTP);
router.post('/resend-otp', otpLimiter,authController.resendOTP);

router.post("/login",loginLimiter,loginValidator, authController.login);
router.post("/logout", authController.logout);

router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', loginLimiter, resetPasswordValidator,authController.resetPassword);
router.post('/accept-invitation', acceptInvitationValidator,authController.acceptInvite);


module.exports =   router
