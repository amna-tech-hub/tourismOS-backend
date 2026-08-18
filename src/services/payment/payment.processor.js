// src/services/payment/payment.processor.js
const Payment = require("../../models/Payment.model");
const Booking = require("../../models/Booking.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const CompanySubscription = require("../../models/CompanySubscription.model");
const Company = require("../../models/Company.model");
const aiCreditService = require("../ai.credit.service");

class PaymentProcessor {
  //  Commission configuration (can be moved to DB for dynamic rates)
  getCommissionRate(payment) {
    const DEFAULT_COMMISSION = 10; // 10%   i will make this dynamic baad mei **
    
    // If payment is for subscription, no commission (we keep 100%)
    if (payment.purpose === "subscription") {
      return 0;
    }
    
    // For bookings, apply commission
    return DEFAULT_COMMISSION;
  }

  async processSuccessfulPayment({
    paymentId,
    transactionId,
    gatewayResponse,
  }) {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error(`Payment record ${paymentId} not found`);
    }

    // Idempotency: Prevent duplicate processing
    if (payment.status === "paid") {
      return payment;
    }

    // ============================================
    // 🆕 CALCULATE COMMISSION BEFORE SAVING
    // ============================================
    const commissionRate = this.getCommissionRate(payment);
    const platformCommission = parseFloat((payment.amount * (commissionRate / 100)).toFixed(2));
    const companyPayout = parseFloat((payment.amount - platformCommission).toFixed(2));

    // Mark payment as paid with commission
    payment.status = "paid";
    payment.transactionId = transactionId;
    payment.gatewayResponse = gatewayResponse;
    payment.paidAt = new Date();
    payment.commissionRate = commissionRate;
    payment.platformCommission = platformCommission;
    payment.companyPayout = companyPayout;
    await payment.save();

    // Process based on payment purpose
    switch (payment.purpose) {
      case "booking":
        await this.handleBookingPayment(payment);
        break;

      case "subscription":
        await this.handleSubscriptionPayment(payment);
        break;

      default:
        console.warn(`Unhandled payment purpose: ${payment.purpose}`);
    }

    return payment;
  }

  async handleBookingPayment(payment) {
    // Update booking status
    const booking = await Booking.findByIdAndUpdate(
      payment.referenceId,
      {
        paymentStatus: "paid",
        status: "confirmed",
        // 🆕 Store commission info on booking for quick access
        platformCommission: payment.platformCommission,
        companyPayout: payment.companyPayout,
      },
      { new: true }
    );

    // 🆕 Update company's total earnings (optional - for caching)
    await Company.findByIdAndUpdate(
      booking.company,
      {
        $inc: {
          totalRevenue: payment.companyPayout,
          totalCommissionPaid: payment.platformCommission,
          totalBookings: 1,
        },
      },
      { upsert: true }
    );

    console.log(`✅ Booking ${booking._id} confirmed. 
      Platform earned: PKR ${payment.platformCommission}
      Company earned: PKR ${payment.companyPayout}`);
  }

  async handleSubscriptionPayment(payment) {
    console.log(payment, "payment from payment processor");
    
    // Find purchased plan
    const plan = await SubscriptionPlan.findById(payment.referenceId);

    if (!plan) {
      throw new Error(`Subscription plan ${payment.referenceId} not found.`);
    }

    // payment.payer contains the User ID
    const company = await Company.findOne({
      ownerId: payment.payer,
      isDeleted: false,
    });

    if (!company) {
      throw new Error(
        `Company not found for user ${payment.payer}.`
      );
    }

    // Create subscription record
    const companySubscription = await CompanySubscription.create({
      company: company._id,
      plan: plan._id,
      payment: payment._id,
      status: "active",
    });

    // Add AI credits
    await aiCreditService.addCredits({
      companyId: company._id,
      credits: plan.aiCredits,
      type: "subscription",
      referenceId: companySubscription._id,
      description: `Purchased ${plan.name} Package (+${plan.aiCredits} AI Credits)`,
    });

    // Update current plan
    company.aiCredits.plan = plan.name;
    await company.save();

    console.log(`✅ Subscription ${companySubscription._id} activated. 
      Platform earned: PKR ${payment.amount} (100% - subscription)`);
  }
}

module.exports = new PaymentProcessor();