const SubscriptionPlan = require("../models/SubscriptionPlan.model");
const Payment = require("../models/Payment.model");
const paymentManager = require("../manager/payment.manager");
const { successResponse, errorResponse } = require("../utils/response.util");

exports.createCheckoutSession = async (req, res) => {
  try {
    const { planId, provider = "stripe" } = req.body;
    const companyId = req.user.company || req.user._id;

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return errorResponse(res, { statusCode: 404, message: "Subscription plan not found or inactive." });
    }

    // 1. Create Pending Payment
    const payment = await Payment.create({
      payer: req.user.id,
      provider,
      purpose: "subscription",
      referenceId: plan._id,
      amount: plan.price,
      currency: plan.currency || "PKR",
      status: "pending",
    });
console.log(payment," payment");

    // 2. Initiate Gateway Session
    const checkoutSession = await paymentManager.createPayment({
      amount: plan.price,
      currency: plan.currency || "PKR",
      paymentId: payment._id,
      orderId: plan._id,
      title: `Purchase ${plan.name} Package (${plan.aiCredits} AI Credits)`,
      provider,
    });
console.log(checkoutSession,"check seccion");

    if (checkoutSession.sessionId) {
      payment.sessionId = checkoutSession.sessionId;
      await payment.save();
    }

    return successResponse(res, {
      statusCode: 200,
      message: "Checkout session created successfully.",
      data: {
        paymentId: payment._id,
        checkoutUrl: checkoutSession.checkoutUrl || checkoutSession.url,
        postData: checkoutSession.postData || null,
      },
    });
  } catch (error) {
    return errorResponse(res, { statusCode: 500, message: error.message });
  }
};