// src/models/User.model.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const baseFields = require("./base/base.schema");

const UserSchema = new mongoose.Schema(
  {
    // Personal Information
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^(\+92|0)?3[0-9]{9}$/,
        "Please enter a valid Pakistani phone number",
      ],
    },
    profilePicture: {
        url: { type: String, default: null },
        public_id: { type: String, default: null },
      },

    // User Settings
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    fcmTokens: [
    { type: String }
  ],
    // Verification
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Base Schema (Audit Fields)
     ...baseFields,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
UserSchema.index({ email: 1, status: 1 });

const User = mongoose.model("User", UserSchema);

module.exports = User;
