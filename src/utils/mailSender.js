// utils/mailSender.js
const nodemailer = require('nodemailer');

const mailSender = async (email, title, body) => {
  try {
    // Create a Transporter using your .env credentials
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: 587, // Secure port for TLS
      secure: false, // Use TLS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Send the email
    const info = await transporter.sendMail({
      from: `"No-Reply" <${process.env.MAIL_USER}>`, 
      to: email, 
      subject: title, 
      html: body, 
    });

    return info;
  } catch (error) {
    console.error("Error occurred while sending mail in utility:", error.message);
    throw error; 
  }
};

module.exports = mailSender;