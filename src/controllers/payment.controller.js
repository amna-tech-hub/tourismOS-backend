// src/controllers/payment.controller.js
const paymentManager = require("../manager/payment.manager");
const paymentProcessor = require("../services/payment/payment.processor");
const jazzCashService = require("../services/payment/jazzcash.service");
const Payment = require("../models/Payment.model");
const mongoose = require("mongoose");
const notificationService = require("../services/notification/notification.service");
/**
 * @desc Handle incoming webhooks (Stripe / Standard Webhooks)
 * @route POST /api/payments/webhook
 * @access Public
 */
// ✅ Fixed version
exports.handleWebhook = async (req, res) => {
  const provider = req.query.provider || process.env.PAYMENT_PROVIDER || "stripe";
  const signature = req.headers["stripe-signature"];

  try {
    let event;

    if (provider === "stripe") {
      event = await paymentManager.verifyWebhook(req.body, signature, "stripe"); // Added await
    } else {
      event = await paymentManager.verifyWebhook(req.body, req.headers, provider); // Added await
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId; // Added optional chaining for safety

      if (paymentId) {
        await paymentProcessor.processSuccessfulPayment({
          paymentId,
          transactionId: session.payment_intent || session.id,
          gatewayResponse: session,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Webhook Error [${provider}]:`, error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

/**
 * @desc Handle JazzCash Browser Redirect Callback
 * @route POST /api/payments/jazzcash/callback
 * @access Public
 */
exports.handleJazzCashCallback = async (req, res) => {
  try {
    const jazzCashData = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const paymentId = jazzCashData.ppmpf_1; // MongoDB Payment _id

    // ============================================
    // FRAUD DETECTION STEP 1: HASH VERIFICATION
    // ============================================
    const isValid = jazzCashService.verifyCallback(jazzCashData);

    if (!isValid) {
      console.error("🚨 FRAUD ATTEMPT: Invalid Hash Signature from IP:", clientIp);

      await Payment.create({
        provider: "jazzcash",
        purpose: "booking",
        amount: jazzCashData.pp_Amount ? parseFloat(jazzCashData.pp_Amount) / 100 : 0,
        currency: jazzCashData.pp_TxnCurrency || "PKR",
        status: "fraud_attempt",
        fraudReason: "INVALID_HASH_SIGNATURE",
        transactionId: jazzCashData.pp_TxnRefNo || null,
        gatewayResponse: jazzCashData,
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(400).json({ success: false, message: "Invalid hash signature" });
    }

    // ============================================
    // FRAUD DETECTION STEP 2: DUPLICATE TRANSACTION
    // ============================================
    if (jazzCashData.pp_TxnRefNo) {
      const existingTxn = await Payment.findOne({ transactionId: jazzCashData.pp_TxnRefNo });

      if (existingTxn) {
        if (existingTxn.status === "paid") {
          return res.redirect(`${process.env.CLIENT_URL}/payment/success`);
        }

        existingTxn.fraudFlags.push({
          type: "DUPLICATE_CALLBACK",
          details: { ip: clientIp, data: jazzCashData },
        });
        existingTxn.status = "fraud_attempt";
        await existingTxn.save();

        return res.status(400).json({ success: false, message: "Duplicate transaction detected" });
      }
    }

    // ============================================
    // FRAUD DETECTION STEP 3: RATE LIMITING
    // ============================================
    const recentPayments = await Payment.find({
      ipAddress: clientIp,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    });

    if (recentPayments.length > 5) {
      console.warn("🚨 FRAUD ATTEMPT: Rate Limit Exceeded from IP:", clientIp);

      await Payment.create({
        provider: "jazzcash",
        purpose: "booking",
        amount: 0,
        currency: "PKR",
        status: "fraud_attempt",
        fraudReason: "RATE_LIMIT_EXCEEDED",
        transactionId: jazzCashData.pp_TxnRefNo || null,
        gatewayResponse: jazzCashData,
        ipAddress: clientIp,
        userAgent,
        fraudFlags: [{ type: "RATE_LIMIT", details: { attempts: recentPayments.length } }],
      });

      return res.status(429).json({ success: false, message: "Too many attempts. Try again later." });
    }

    // ============================================
    // FRAUD DETECTION STEP 4: SUSPICIOUS AMOUNT
    // ============================================
    const amountInPKR = parseFloat(jazzCashData.pp_Amount) / 100;
    const MAX_AMOUNT = 500000;
    const MIN_AMOUNT = 10;

    if (amountInPKR > MAX_AMOUNT || amountInPKR < MIN_AMOUNT) {
      const reason = amountInPKR > MAX_AMOUNT ? "SUSPICIOUS_AMOUNT_HIGH" : "SUSPICIOUS_AMOUNT_LOW";

      await Payment.create({
        provider: "jazzcash",
        purpose: "booking",
        amount: amountInPKR,
        currency: "PKR",
        status: "fraud_attempt",
        fraudReason: reason,
        transactionId: jazzCashData.pp_TxnRefNo || null,
        gatewayResponse: jazzCashData,
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(400).json({ success: false, message: "Invalid amount threshold" });
    }

    //  PROCESS SUCCESSFUL OR FAILED PAYMENT
  const isSuccess = 
    jazzCashData.pp_ResponseCode === "000" || 
    (!jazzCashData.pp_ResponseCode && jazzCashData.pp_TxnRefNo);

if (isSuccess) {
  //  ONLY divide by 100 IF the amount comes from Stripe. 
  // Since this is JazzCash, we NEVER divide by 100.
  const amountInPKR = parseFloat(jazzCashData.pp_Amount);

      // Valid ObjectId check
      const validPaymentId = mongoose.Types.ObjectId.isValid(paymentId) ? paymentId : null;

      let paymentDoc = validPaymentId ? await Payment.findById(validPaymentId) : null;

     if (paymentDoc) {
  paymentDoc.transactionId = jazzCashData.pp_TxnRefNo;
  paymentDoc.gatewayResponse = jazzCashData;
  paymentDoc.ipAddress = clientIp;
  paymentDoc.userAgent = userAgent;

  await paymentDoc.save();
} else {
        paymentDoc = await Payment.create({
          provider: "jazzcash",
          purpose: "booking",
          amount: amountInPKR,
          currency: jazzCashData.pp_TxnCurrency || "PKR",
          status: "paid",
          transactionId: jazzCashData.pp_TxnRefNo,
          gatewayResponse: jazzCashData,
          ipAddress: clientIp,
          userAgent,
          paidAt: new Date(),
        });
      }

      // Delegate business operations (update Booking/Subscription status)
      await paymentProcessor.processSuccessfulPayment({
        paymentId: paymentDoc._id,
        transactionId: jazzCashData.pp_TxnRefNo,
        gatewayResponse: jazzCashData,
      });

      return res.redirect(`${process.env.CLIENT_URL}/payment/success`);
    } else {
  // ============================================
  // PAYMENT FAILED
  // ============================================

  if (mongoose.Types.ObjectId.isValid(paymentId)) {
    const paymentDoc = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: "failed",
        fraudReason:
          jazzCashData.pp_ResponseMessage ||
          "GATEWAY_DECLINED",
        gatewayResponse: jazzCashData,
        ipAddress: clientIp,
        userAgent,
      },
      { new: true }
    );

    // ============================================
    // SEND PAYMENT FAILED NOTIFICATION
    // ============================================

    if (paymentDoc?.payer) {
      await notificationService.sendToUser(
        paymentDoc.payer,
        {
          title: "Payment Failed ❌",
          body:
            "Your payment could not be completed. Please try again.",
          type: "PAYMENT_FAILED",

          extraData: {
            paymentId: paymentDoc._id.toString(),
            purpose: paymentDoc.purpose,
            screen: "payments",
          },
        }
      );
    }
  }

  return res.redirect(
    `${process.env.CLIENT_URL}/payment/cancel`
  );
}
  } catch (error) {
    console.error(" CRITICAL CALLBACK ERROR:", error);

    await Payment.create({
      provider: "jazzcash",
      purpose: "booking",
      amount: 0,
      currency: "PKR",
      status: "system_error",
      fraudReason: "CALLBACK_PROCESSING_ERROR",
      gatewayResponse: { error: error.message, stack: error.stack },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ success: false, message: "Callback processing failed" });
  }
};

/**
 * @desc Verify Stripe Session / Payment status for Frontend Success Page
 * @route GET /api/payments/verify-session
 * @access Public
 */
/**
 * @desc Verify Stripe Session / Payment status for Frontend Success Page
 * @route GET /api/payments/verify-session
 * @access Public
 */
exports.verifySession = async (req, res) => {
  try {
    const { session_id, payment_id, type } = req.query;

    let paymentDoc = null;
    if (mongoose.Types.ObjectId.isValid(payment_id)) {
      paymentDoc = await Payment.findById(payment_id).populate("payer", "email");
    }

    if (!paymentDoc) {
      return res.status(404).json({ success: false, message: "Payment record not found" });
    }

    // Always prioritize the DB payment record's purpose
    const resolvedType = paymentDoc.purpose || type || "booking";

    // Delegate summary generation to paymentProcessor
    const summaryData = await paymentProcessor.getPaymentSummary({
      paymentDoc,
      type: resolvedType,
      sessionId: session_id,
    });

    // Ensure customer email is passed back
    if (!summaryData.customerEmail && paymentDoc.payer?.email) {
      summaryData.customerEmail = paymentDoc.payer.email;
    }

    return res.status(200).json({
      success: true,
      status: paymentDoc.status,
      type: resolvedType, // Returns "subscription" or "booking"
      data: summaryData,
    });
  } catch (error) {
    console.error("Verify Session Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to verify session" });
  }
};