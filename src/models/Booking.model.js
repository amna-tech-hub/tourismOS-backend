// src/models/Booking.model.js

const mongoose = require("mongoose");
const baseFields = require("./base/base.schema");

const bookingSchema = new mongoose.Schema(
  {
    // ==========================================
    // TRAVELER
    // ==========================================
    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // PAYMENT
    // ==========================================
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },

    // ==========================================
    // TOUR
    // ==========================================
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: true,
    },

    // ==========================================
    // COMPANY
    // ==========================================
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
     
    },

    // ==========================================
    // BOOKING DETAILS
    // ==========================================
    participants: {
      type: Number,
      default: 1,
      min: 1,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    bookingDate: {
      type: Date,
      default: Date.now,
    },

    travelDate: {
      type: Date,
      required: true,
    },

    // ==========================================
    // BOOKING STATUS
    // ==========================================
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
      ],
      default: "pending",
    },

    // ==========================================
    // PAYMENT STATUS
    // ==========================================
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "refunded",
      ],
      default: "pending",
    },

    // ==========================================
    // PLATFORM COMMISSION
    // ==========================================
    platformCommission: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // COMPANY PAYOUT
    // totalAmount - platformCommission
    // ==========================================
    companyPayout: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ==========================================
    // BASE FIELDS
    // ==========================================
    ...baseFields,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Booking", bookingSchema);