// src/models/Payment.model.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, 
    },
    provider: {
      type: String,
      enum: ["stripe", "easypaisa", "jazzcash"],
      default: "jazzcash",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["booking", "subscription"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "PKR",
      uppercase: true,
    },
    companyId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Company",
  required: false, // For subscriptions, it's not needed
},
    
//  commision fields
    platformCommission: {
      type: Number,
      default: 0,
      min: 0,
      // For bookings: 10% of amount
      // For subscriptions: 0 (we keep 100%)
    },
    companyPayout: {
      type: Number,
      default: 0,
      min: 0,
      // For bookings: 90% of amount
      // For subscriptions: 0
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      // Store the rate used (e.g., 10)
    },
    
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "fraud_attempt", "system_error"],
      default: "pending",
    },
    transactionId: {
      type: String,
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    gatewayResponse: {
      type: Object,
      default: {},
    },
    paidAt: {
      type: Date,
      default: null,
    },
    fraudReason: {
      type: String,
      default: null,
    },
    fraudFlags: [
      {
        type: { type: String },
        details: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// 🆕 Index for faster analytics queries
paymentSchema.index({ purpose: 1, status: 1, paidAt: -1 });
paymentSchema.index({ companyPayout: 1, platformCommission: 1 });

module.exports = mongoose.model("Payment", paymentSchema);