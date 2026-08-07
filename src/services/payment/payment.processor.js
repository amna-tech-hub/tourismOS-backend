const Payment = require("../../models/Payment.model");
const Booking = require("../../models/Booking.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const CompanySubscription = require("../../models/CompanySubscription.model");
const Company = require("../../models/Company.model");
const aiCreditService = require("../ai.credit.service");

class PaymentProcessor {
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

    // Mark payment as paid
    payment.status = "paid";
    payment.transactionId = transactionId;
    payment.gatewayResponse = gatewayResponse;
    payment.paidAt = new Date();
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
    await Booking.findByIdAndUpdate(payment.referenceId, {
      paymentStatus: "paid",
      status: "confirmed",
    });
  }

  async handleSubscriptionPayment(payment) {
    console.log(payment,"payment from payment processor");
    
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
  }
}

module.exports = new PaymentProcessor();