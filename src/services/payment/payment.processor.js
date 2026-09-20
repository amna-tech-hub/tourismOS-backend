// src/services/payment/payment.processor.js
const Payment = require("../../models/Payment.model");
const Booking = require("../../models/Booking.model");
const SubscriptionPlan = require("../../models/SubscriptionPlan.model");
const CompanySubscription = require("../../models/CompanySubscription.model");
const Company = require("../../models/Company.model");
const aiCreditService = require("../ai.credit.service");
const notificationService = require("../notification/notification.service");

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
// Add inside the PaymentProcessor class in payment.processor.js

async getPaymentSummary({ paymentDoc, type, sessionId }) {
  // 1. If payment is still pending, verify directly with Stripe and process if completed
  if (paymentDoc.status === "pending" && sessionId) {
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        await this.processSuccessfulPayment({
          paymentId: paymentDoc._id,
          transactionId: session.payment_intent || session.id,
          gatewayResponse: session,
        });
        // Refresh updated document from DB
        paymentDoc = await Payment.findById(paymentDoc._id);
      }
    } catch (err) {
      console.error("Stripe Session Retrieval Error:", err.message);
    }
  }

  // Determine true payment purpose from the DB record
  const actualPurpose = paymentDoc.purpose || type;

  // 2. Format response for Subscriptions
  if (actualPurpose === "subscription") {
    const plan = await SubscriptionPlan.findById(paymentDoc.referenceId);
    
    return {
      orderId: paymentDoc._id,
      customerEmail: paymentDoc.gatewayResponse?.customer_details?.email || "",
      details: {
        title: plan ? `${plan.name} Plan` : "Subscription Plan",
        subtitle: plan ? `Includes ${plan.aiCredits} AI Credits` : "AI Credits & Features",
        amount: `$${paymentDoc.amount}`,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      },
    };
  }

  // 3. Format response for Bookings
  const booking = await Booking.findById(paymentDoc.referenceId).populate("tour");

  return {
    orderId: paymentDoc._id,
    customerEmail: paymentDoc.gatewayResponse?.customer_details?.email || "",
    details: {
      title: booking?.tour?.title || "Tour Booking",
      startDate: booking ? `${booking.startDate || "Confirmed"}` : "Confirmed",
      location: booking?.tour?.destination || "Destination",
      amount: `$${paymentDoc.amount}`,
    },
  };
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

  // Idempotency
  if (payment.status === "paid") {
    return payment;
  }

  const commissionRate = this.getCommissionRate(payment);

  const platformCommission = parseFloat(
    (payment.amount * (commissionRate / 100)).toFixed(2)
  );

  const companyPayout = parseFloat(
    (payment.amount - platformCommission).toFixed(2)
  );

  payment.status = "paid";
  payment.transactionId = transactionId;
  payment.gatewayResponse = gatewayResponse;
  payment.paidAt = new Date();
  payment.commissionRate = commissionRate;
  payment.platformCommission = platformCommission;
  payment.companyPayout = companyPayout;

  await payment.save();

  switch (payment.purpose) {
    case "booking":
      await this.handleBookingPayment(payment);
      break;

    case "subscription":
      await this.handleSubscriptionPayment(payment);
      break;

    default:
      console.warn(
        `Unhandled payment purpose: ${payment.purpose}`
      );
  }

  return payment;
}

 async handleBookingPayment(payment) {
  const booking = await Booking.findByIdAndUpdate(
    payment.referenceId,
    {
      paymentStatus: "paid",
      status: "confirmed",
      platformCommission: payment.platformCommission,
      companyPayout: payment.companyPayout,
    },
    { new: true }
  );

  if (!booking) {
    throw new Error(
      `Booking ${payment.referenceId} not found`
    );
  }

  // Update company's total earnings
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

  // ==========================================
  // SEND BOOKING PAYMENT SUCCESS NOTIFICATION
  // ==========================================

  await notificationService.sendToUser(
    payment.payer,
    {
      title: "Payment Successful 🎉",
      body: "Your tour booking payment was successful and your booking is now confirmed.",
      type: "PAYMENT_SUCCESS",

      extraData: {
        paymentId: payment._id.toString(),
        bookingId: booking._id.toString(),
        screen: "booking",
      },
    }
  );

  console.log(
    `✅ Booking ${booking._id} confirmed.
    Platform earned: PKR ${payment.platformCommission}
    Company earned: PKR ${payment.companyPayout}`
  );
}

async handleSubscriptionPayment(payment) {
  console.log(
    payment,
    "payment from payment processor"
  );

  // ==========================================
  // FIND PLAN
  // ==========================================

  const plan = await SubscriptionPlan.findById(
    payment.referenceId
  );

  if (!plan) {
    throw new Error(
      `Subscription plan ${payment.referenceId} not found.`
    );
  }

  // ==========================================
  // FIND COMPANY
  // ==========================================

  const company = await Company.findOne({
    ownerId: payment.payer,
    isDeleted: false,
  });

  if (!company) {
    throw new Error(
      `Company not found for user ${payment.payer}.`
    );
  }

  // ==========================================
  // CREATE SUBSCRIPTION
  // ==========================================

  const companySubscription =
    await CompanySubscription.create({
      company: company._id,
      plan: plan._id,
      payment: payment._id,
      status: "active",
    });

  // ==========================================
  // ADD AI CREDITS
  // ==========================================

  await aiCreditService.addCredits({
    companyId: company._id,
    credits: plan.aiCredits,
    type: "subscription",
    referenceId: companySubscription._id,
    description:
      `Purchased ${plan.name} Package (+${plan.aiCredits} AI Credits)`,
  });

  // ==========================================
  // UPDATE COMPANY PLAN
  // ==========================================

  company.aiCredits.plan = plan.name;

  await company.save();

  // ==========================================
  // SEND SUCCESS NOTIFICATION
  // ==========================================

  await notificationService.sendToUser(
    payment.payer,
    {
      title: "Subscription Activated 🎉",
      body: `Your ${plan.name} subscription was successfully activated. You received ${plan.aiCredits} AI credits.`,

      type: "SUBSCRIPTION_UPDATE",

      extraData: {
        paymentId: payment._id.toString(),
        subscriptionId:
          companySubscription._id.toString(),
        planId: plan._id.toString(),
        screen: "subscription",
      },
    }
  );

  console.log(
    `✅ Subscription ${companySubscription._id} activated.
    Platform earned: PKR ${payment.amount} (100% - subscription)`
  );
}
}

module.exports = new PaymentProcessor();