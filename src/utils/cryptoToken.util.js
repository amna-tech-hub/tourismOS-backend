const crypto = require("crypto");

const generateCryptoToken = () => {
  // 1. Generate unhashed random raw token (sent in the email link)
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash the token using SHA-256 (saved in database)
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
};

module.exports = { generateCryptoToken };