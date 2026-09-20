const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {
  /**
   * Creates a Checkout Session supporting both Bookings and Subscriptions
   */
  async createPayment(paymentData) {
    const {
      paymentId,
      amount,
      currency = "pkr",
      title = "Payment",
      userEmail,
    } = paymentData;

    // 1. Safely resolve purpose/type (prevents type=undefined in redirect URL)
    const purpose = paymentData.purpose || paymentData.type || "booking";

    // 2. Determine session mode dynamically based on purpose
    const mode = purpose === "subscription" ? "subscription" : "payment";

    // 3. Build price data structure
    const lineItemPriceData = {
      currency: currency.toLowerCase(),
      product_data: {
        name: title,
      },
      unit_amount: Math.round(amount * 100), // Convert to smallest currency unit (cents/paisa)
    };

    // Stripe recurring configuration (Required if mode is "subscription")
    if (mode === "subscription") {
      lineItemPriceData.recurring = {
        interval: "month", // Adjust to "year" if needed
      };
    }

    // 4. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: lineItemPriceData,
          quantity: 1,
        },
      ],
      mode: mode,
      client_reference_id: paymentId ? paymentId.toString() : undefined,
      customer_email: userEmail,
      // Pass purpose and paymentId cleanly to frontend success page
      success_url: `${process.env.CLIENT_URL}/payment/success?type=${purpose}&payment_id=${paymentId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel?payment_id=${paymentId}`,
      metadata: {
        paymentId: paymentId ? paymentId.toString() : "",
        purpose: purpose,
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  verifyWebhook(rawBody, signature) {
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }
}

module.exports = new StripeService();