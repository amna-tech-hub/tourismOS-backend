const mongoose = require("mongoose");
const baseFields = require("./base/base.schema");

const companySchema = new mongoose.Schema(
    {
           ownerId :{
            type: String,
            default:null
        },
        companyName: {
            type: String,
            required: [true, "Company name is required"],
            trim: true,
            maxlength: [100, "Company name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Company email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email address",
            ],
        },
        address: {
            type: String,
            trim: true,
            maxlength: [100, "Company adress cannot exceed 100 characters"],
        },
       
       phone: {
    type: String,
    trim: true,
    match: [/^\+?[0-9]{10,15}$/, "Please provide a valid phone number"],
},
        logo: {
            type: String, // URL or image path
           default: null,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },
        verificationStatus: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending",
        },
       
        subscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subscription", // References a Subscription model 
        },
         
      
      ...baseFields
    },
    {
        timestamps: true, // Automatically creates `createdAt` and `updatedAt`
    }
);
// companySchema.index({ name: 1 });

// companySchema.index({ email: 1 });
const Company = mongoose.model("Company", companySchema);

module.exports = Company;