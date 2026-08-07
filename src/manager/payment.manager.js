// src/services/payment/payment.manager.js
const stripeService = require("../services/payment/stripe.service");
const easypaisaService = require("../services/payment/easypaisa.service");
const jazzcashService = require("../services/payment/jazzcash.service");

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
    const { provider: providerName } = paymentData;
    console.log(paymentData
      ,"paymentdata"
    );
    
    // Resolve provider instance safely
    const activeProvider = this.getProvider(providerName);
    console.log(activeProvider,"active provider");
    
    // Pass full paymentData to the selected provider service
    return await activeProvider.createPayment(paymentData);
  }

  verifyWebhook(payload, signature, providerOverride = null) {
    const activeProvider = this.getProvider(providerOverride);
    return activeProvider.verifyWebhook(payload, signature);
  }
  
}

module.exports = new PaymentManager();