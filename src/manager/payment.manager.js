// src/services/payment/payment.manager.js (Updated)
const stripeService = require("../services/payment/stripe.service");
const easypaisaService = require("../services/payment/easypaisa.service");
const jazzcashService = require("../services/payment/jazzcash.service");
const Payment = require("../models/Payment.model");

class PaymentManager {
  constructor() {
    this.providers = {
      stripe: stripeService,
      easypaisa: easypaisaService,
      jazzcash: jazzcashService,
    };
  }

  getProvider(providerName) {
    if (!providerName || typeof providerName !== "string") {
      throw new Error(`Unsupported payment provider: ${providerName}`);
    }

    const selectedProvider = this.providers[providerName.toLowerCase()];
    if (!selectedProvider) {
      throw new Error(`Unsupported payment provider: ${providerName}`);
    }
    return selectedProvider;
  }

  async createPayment(paymentData) {
    try {
      const { provider: providerName } = paymentData;
      
      const activeProvider = this.getProvider(providerName);
      
      // Pass full paymentData to the selected provider service
      return await activeProvider.createPayment(paymentData);
      
    } catch (error) {
      console.error("Payment creation error:", error);
      throw error;
    }
  }

  async verifyWebhook(payload, signature, providerOverride = null) {
    try {
      const activeProvider = this.getProvider(providerOverride);
      console.log("Verifying webhook with provider:", providerOverride);
      
      return await activeProvider.verifyWebhook(payload, signature);
      
    } catch (error) {
      console.error("Webhook verification error:", error);
      throw error;
    }
  }

  // Add method to check payment status
  async checkPaymentStatus(provider, sessionId) {
    try {
      const activeProvider = this.getProvider(provider);
      if (activeProvider.checkStatus) {
        return await activeProvider.checkStatus(sessionId);
      }
      throw new Error(`Status check not supported for provider: ${provider}`);
    } catch (error) {
      console.error("Status check error:", error);
      throw error;
    }
  }
}

module.exports = new PaymentManager();