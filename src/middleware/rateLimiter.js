// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

//  Strict Limiter for Email
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 3, 
    message: {
        success: false,
        message: "Too many OTP requests. Please try again in 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

//  Security Limiter for Logins 
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 10, //10 attemp
    message: {
        success: false,
        message: "Too many login attempts. Please try again in 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { 
    otpLimiter, 
    loginLimiter 
};