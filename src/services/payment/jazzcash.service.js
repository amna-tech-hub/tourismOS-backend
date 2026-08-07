const crypto = require("crypto");

class JazzCashService {
  /**
   * Generate Secure Hash for JazzCash
   */
  generateSecureHash(params) {
    // Sort keys alphabetically (required by JazzCash)
    const sortedKeys = Object.keys(params).sort();
    let hashString = process.env.JAZZCASH_INTEGERITY_SALT;

    for (const key of sortedKeys) {
      if (params[key] !== "" && params[key] !== null && params[key] !== undefined) {
        hashString += `&${params[key]}`;
      }
    }

    return crypto
      .createHmac("sha256", process.env.JAZZCASH_INTEGERITY_SALT)
      .update(hashString)
      .digest("hex")
      .toUpperCase();
  }

  /**
   * Initiate JazzCash Payment Session
   */
  async createPayment({ amount, currency, orderId, paymentId, description, title }) {
    // Standardize variables (supports both paymentId/orderId and title/description)
    const referenceId = (paymentId || orderId || "").toString();
    const itemDescription = title || description || "TourismOS Booking";

    if (!referenceId) {
      throw new Error("Payment Reference ID (paymentId or orderId) is required.");
    }

    // JazzCash expects amount formatted in Paisa (e.g., 2000 PKR = 200000)
    const formattedAmount = Math.round(amount * 100);
    const date = new Date();
    
    // Format timestamp as YYYYMMDDHHmmss
    const txnDateTime = date.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
    
    // Set expiration (e.g., 1 hour from now)
    date.setHours(date.getHours() + 1);
    const expiryDateTime = date.toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);

    const postData = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET", // Mobile Wallet / Card hosted page
      pp_Language: "EN",
      pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
      pp_Password: process.env.JAZZCASH_PASSWORD,
      pp_TxnRefNo: `T${Date.now()}`,
      pp_Amount: formattedAmount.toString(),
      pp_TxnCurrency: currency || "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: referenceId,
      pp_Description: itemDescription,
      pp_TxnExpiryDateTime: expiryDateTime,
      pp_ReturnURL: process.env.JAZZCASH_RETURN_URL,
      ppmpf_1: referenceId, // Store MongoDB paymentId here
    };

    // Calculate Secure Hash
    postData.pp_SecureHash = this.generateSecureHash(postData);

    return {
      provider: "jazzcash",
      checkoutUrl: process.env.JAZZCASH_API_URL,
      postData, // Frontend/Postman submits these form fields via POST
      sessionId: postData.pp_TxnRefNo,
    };
  }

  /**
   * Verify Callback Hash from JazzCash
   */
  verifyCallback(callbackData) {
    const receivedHash = callbackData.pp_SecureHash;
    const dataToHash = { ...callbackData };
    delete dataToHash.pp_SecureHash; // Remove received hash before verification

    const calculatedHash = this.generateSecureHash(dataToHash);
    return receivedHash === calculatedHash;
  }
}

module.exports = new JazzCashService();