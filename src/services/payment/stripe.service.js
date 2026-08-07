const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class StripeService {
  /**
   * Creates a Checkout Session using generic Payment record details
   */
  async createPayment({ paymentId, amount, currency, title, userEmail }) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: title,
            },
            unit_amount: Math.round(amount * 100), // Cents / Paisa
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      client_reference_id: paymentId.toString(),
      customer_email: userEmail,
success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: {
        paymentId: paymentId.toString(),
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