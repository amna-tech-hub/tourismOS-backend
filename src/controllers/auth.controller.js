const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");

// Models
const User = require("../models/User.model");
const Role = require("../models/Role.model");
const OTP = require("../models/OTP.model");
const Company = require("../models/Company.model");
const Employee = require("../models/Employee.model");
const Invitation = require("../models/Invitation.model");

// Services & Utilities
const mailSender = require("../services/email/mailSender");
const ApiFeatures = require("../utils/apiFeatures.util");
const { successResponse, errorResponse } = require("../utils/response.util");

const register = async (req, res) => {
  try {
    const { name, email, password, phone, gender } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Name, email and password are required.",
      });
    }

    // Checking if email already exists
    const existingUser = await User.findOne({ email, isDeleted: false });
    if (existingUser) {
      return errorResponse(res, {
        statusCode: 409,
        message: "Email already exists.",
      });
    }

    // Find Default User Role
    const userRole = await Role.findOne({ name: "traveler" });
    if (!userRole) {
      return errorResponse(res, {
        statusCode: 500,
        message: "User role not found.",
      });
    }

    const saltForPassword = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, saltForPassword);

    // Create User with the hashed password
    await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      gender,
      role: userRole._id,
      emailVerified: false,
    });

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Hash OTP for security in database
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

    return successResponse(res, {
      statusCode: 201,
      message: "User registered! Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Register Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Email and OTP are both required.",
      });
    }

    const latestOtpRecord = await OTP.findOne({ email }).sort({
      createdAt: -1,
    });
    if (!latestOtpRecord) {
      return errorResponse(res, {
        statusCode: 400,
        message: "OTP has expired or does not exist. Please request a new one.",
      });
    }

    const isOtpValid = await bcrypt.compare(otp, latestOtpRecord.otp);
    if (!isOtpValid) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid OTP.",
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { emailVerified: true },
      { new: true }
    ).populate("role");

    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    // Delete the OTP record so it can't be reused
    await OTP.deleteOne({ _id: latestOtpRecord._id });

    // Generate a single token valid for 7 Days
    const token = jwt.sign(
      { id: user._id, role: user.role.name },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "7d" }
    );

    // Configure Cookie Options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    res.cookie("token", token, cookieOptions);

    return successResponse(res, {
      statusCode: 200,
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
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    if (user.isVerified) {
      return errorResponse(res, {
        statusCode: 400,
        message: "This account is already verified. Please log in.",
      });
    }

    // Generate a new 6-digit OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    // Hash and save the new OTP
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // Send the fresh OTP email
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your New Verification Code</h2>
          <p>You requested a new verification code. Use the OTP below to verify your account:</p>
          <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
          <p>This code is valid for 5 minutes.</p>
      </div>
    `;
    await mailSender(email, "Resend: Verify your email address", emailBody);

    return successResponse(res, {
      statusCode: 200,
      message: "A fresh OTP has been sent to your email inbox!",
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email }).select("+password").populate("role");
    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Invalid email or password.",
      });
    }

    if (!user.emailVerified) {
      return errorResponse(res, {
        statusCode: 403,
        message: "Please verify your email using OTP before logging in.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Invalid email or password.",
      });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user._id, role: user.role.name },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "7d" }
    );

    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    res.cookie("token", token, cookieOptions);

    return successResponse(res, {
      statusCode: 200,
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
    console.error("Login Error:", error);
    return errorResponse(res, {
      statusCode: 500,
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

    res.clearCookie("token", cookieOptions);

    return successResponse(res, {
      statusCode: 200,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, {
        statusCode: 404,
        message: "No account found with this email.",
      });
    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
    });

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Use the verification code below to proceed:</p>
          <h1 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h1>
          <p>This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;
    await mailSender(email, "Reset Your Password", emailBody);

    return successResponse(res, {
      statusCode: 200,
      message: "A password reset code has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Email, OTP, and new password are all required.",
      });
    }

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return errorResponse(res, {
        statusCode: 400,
        message: "OTP expired or not found. Please request a new one.",
      });
    }

    const isOtpValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOtpValid) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid verification code.",
      });
    }

    const saltForPassword = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, saltForPassword);

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return errorResponse(res, {
        statusCode: 404,
        message: "User not found.",
      });
    }

    await OTP.deleteOne({ email });

    return successResponse(res, {
      statusCode: 200,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return errorResponse(res, {
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};

const acceptInvite = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Token, name, and password are required.",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

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

    const existingUser = await User.findOne({ email: invitation.email, isDeleted: false });
    if (existingUser) {
      return errorResponse(res, {
        statusCode: 409,
        message: "An account with this email already exists.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role,
      emailVerified: true,
      status: "active",
    });

    const role = await Role.findById(invitation.role);

    if (role && role.name === "company_admin") {
      await Company.findOneAndUpdate(
        { _id: invitation.company },
        {
          ownerId: user._id,
          verificationStatus: "verified",
        }
      );
    }

    if (role && role.name === "employee") {
      await Employee.findOneAndUpdate(
        { user: invitation.user },
        {
          $set: {
            user: user._id,
            status: "active",
          },
        },
        { new: true }
      );
    }

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

const getAllUsers = async (req, res) => {
  try {
    const filterCriteria = {
      role: "6a5e05f512174bacfa8ec2ec",
    };

    const baseQuery = User.find(filterCriteria).populate("role", "name");
    const totalDocuments = await User.countDocuments(filterCriteria);

    const features = new ApiFeatures(baseQuery, req.query)
      .search(["name", "email", "phone"])
      .filter()
      .sort()
      .paginate();

    const users = await features.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    return successResponse(res, {
      statusCode: 200,
      message: "Users fetched successfully.",
      data: users,
      meta: {
        totalDocuments,
        page,
        limit,
        totalPages: Math.ceil(totalDocuments / limit),
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
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
  acceptInvite,
  getAllUsers,
};