const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    user:{
       type: mongoose.Schema.Types.ObjectId,
      ref: "User",
     
    },
      phone: {
    type: String,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, "Please provide a valid phone number"],
},
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    token: {
      type: String, // Hashed token stored in DB
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invitation", invitationSchema);