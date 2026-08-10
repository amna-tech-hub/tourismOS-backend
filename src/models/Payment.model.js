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
      enum: ["booking", "subscription"],  //subscription for ai credits
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Optional for orphan fraud records
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

module.exports = mongoose.model("Payment", paymentSchema);