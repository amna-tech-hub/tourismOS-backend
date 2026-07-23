const User = require("../models/User.model");
const Role = require("../models/Role.model");
const OTP = require("../models/OTP.model");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");
const mailSender = require("../services/email/mailSender");

const register = async (req, res) => {
  try {
    const { name, email, password, phone, gender } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    // Checking if email already exists
    const existingUser = await User.findOne({ email, isDeleted: false });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    // Find Default User Role
    const userRole = await Role.findOne({ name: "user" });
    if (!userRole) {
      return res.status(500).json({
        success: false,
        message: " user role not found.",
      });
    }

    const saltForPassword = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, saltForPassword);

    // 2. Create User with the hashed password
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      gender,
      role: userRole._id,
      emailVerified: false,
    });

    // 3. Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // 4. Hash OTP for security in database
    const saltForOtp = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, saltForOtp);
    await OTP.create({ email, otp: hashedOtp });

    // Send Verification mail
    const emailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Welcome ${name}!</h2>
                <p>Please use this verification code to complete your registration:</p>
                <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
                <p>This code is valid for 5 minutes.</p>
            </div>
        `;
    await mailSender(email, "Verify your email address", emailBody);

    return res.status(201).json({
      success: true,
      message:
        "User registered! Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const jwt = require("jsonwebtoken");

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are both required.",
      });
    }

    const latestOtpRecord = await OTP.findOne({ email }).sort({
      createdAt: -1,
    });
    if (!latestOtpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or does not exist. Please request a new one.",
      });
    }

    const isOtpValid = await bcrypt.compare(otp, latestOtpRecord.otp);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { emailVerified: true },
      { new: true },
    ).populate("role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    //  Delete the OTP record so it can't be reused
    await OTP.deleteOne({ _id: latestOtpRecord._id });

    //  Generate a single token valid for 7 Days
    const token = jwt.sign(
      { id: user._id, role: user.role.name },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "7d" },
    );

    // Configure Cookie Options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Prevents CSRF attacks
    };

    // Send the response with the cookie
    return res
      .status(200)
      .cookie("token", token, cookieOptions)
      .json({
        success: true,
        message: "Account verified successfully!",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role.name,
          },
        },
      });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This account is already verified. Please log in.",
        });
    }

    // 2. Generate a new 6-digit OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    //  Hash and save the new OTP
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    // We update or create a new record for this email
    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, createdAt: Date.now() },
      { upsert: true, new: true },
    );

    // 4. Send the fresh OTP email
    const emailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Your New Verification Code</h2>
                <p>You requested a new verification code. Use the OTP below to verify your account:</p>
                <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
                <p>This code is valid for 5 minutes.</p>
            </div>
        `;
    await mailSender(email, "Resend: Verify your email address", emailBody);

    return res.status(200).json({
      success: true,
      message: "A fresh OTP has been sent to your email inbox!",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select("+password").populate("role");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email using OTP before logging in.",
      });
    }
    console.log(password, " pass", user.password, " user pass");

    // 3. Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    console.log(isPasswordCorrect, " is correct");

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // token
    const token = jwt.sign(
      { id: user._id, role: user.role.name },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "7d" },
    );

    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // Prevents CSRF attacks
    };

    // Send the with the cookie
    return res
      .status(200)
      .cookie("token", token, cookieOptions)
      .json({
        success: true,
        message: "Logged in successfully!",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role.name,
          },
        },
      });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const logout = async (req, res) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    return res.status(200).clearCookie("token", cookieOptions).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });
    }

    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "No account found with this email." });
    }

    // 2. Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // 3. Hash and store OTP in database
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, createdAt: Date.now() },
      { upsert: true, new: true },
    );

    // 4. Send Email
    const emailBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>We received a request to reset your password. Use the verification code below to proceed:</p>
                <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
                <p>This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
            </div>
        `;
    await mailSender(email, "Reset Your Password", emailBody);

    return res.status(200).json({
      success: true,
      message: "A password reset code has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are all required.",
      });
    }

    // 1. Find the OTP record
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    // 2. Verify OTP matches
    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification code." });
    }

    // 3. Hash the new password
    const saltForPassword = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, saltForPassword);
    // 4. Update the user's password in the database
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true },
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // 5. Clean up by deleting the used OTP from the database
    await OTP.deleteOne({ email });

    return res.status(200).json({
      success: true,
      message:
        "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const crypto = require("crypto");
const Invitation = require("../models/Invitation.model");
const { successResponse, errorResponse } = require("../utils/response.util");
const Company = require("../models/Company.model");

const acceptInvite = async (req, res) => {
    try {
        const { token, name, password } = req.body;

        if (!token || !name || !password) {
            return errorResponse(res, {
                statusCode: 400,
                message: "Token, name, and password are required.",
            });
        }

        // 1. Hash the incoming raw token to compare with the DB hash
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // 2. Find valid, non-expired, unused invitation
        const invitation = await Invitation.findOne({
            token: hashedToken,
            isAccepted: false,
            expiresAt: { $gt: Date.now() },
        });

        if (!invitation) {
            return errorResponse(res, {
                statusCode: 400,
                message: "Invalid or expired invitation token.",
            });
        }

        // 3. Check if user with this email already exists
        const existingUser = await User.findOne({ email: invitation.email, isDeleted: false });
        if (existingUser) {
            return errorResponse(res, {
                statusCode: 409,
                message: "An account with this email already exists.",
            });
        }

     // 4. Hash the new password
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

// 5. Create the Company Admin User
const user = await User.create({
    name,
    email: invitation.email,
    password: hashedPassword,
    role: invitation.role, // company_admin role ID
    emailVerified: true,
    status: "active",
});

// 6. Link User as Owner and Verify Company 
await Company.findByIdAndUpdate(invitation.company, {
    ownerId: user._id,
    verificationStatus: "verified" 
});

// 7. Mark invitation as accepted
invitation.isAccepted = true;
await invitation.save();

return successResponse(res, {
    statusCode: 201,
    message: "Account setup successfully! You can now log in.",
    data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: invitation.company, 
    },
});
    } catch (error) {
        console.error("Accept Invitation Error:", error);
        return errorResponse(res, {
            statusCode: 500,
            message: "Internal Server Error",
        });
    }
};


module.exports = {
  register,
  verifyOTP,
  login,
  logout,
  resendOTP,
  forgotPassword,
  resetPassword,
  acceptInvite
};
