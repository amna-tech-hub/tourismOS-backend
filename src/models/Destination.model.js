const mongoose = require("mongoose");

const DestinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["landmark", "hotel", "restaurant", "activity", "city"],
      required: true,
    },
    location: {
      city: { type: String, required: true },
      province: { type: String, required: true }, // e.g., Gilgit-Baltistan, Punjab
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
    },
    description: {
      type: String,
      required: true,
    },
    images: [{ type: String }], // Array of image URLs (Cloudinary)
    averageRating: {
      type: Number,
      default: 0,
    },
    // For your MVP Safety Advisor
    safetyAlerts: {
      type: String,
      default: "No active alerts. Safe to visit.",
    },
    bestTimeToVisit: {
      type: String, // e.g., "April to October"
    },
  },
  { timestamps: true }
);

// Geo-spatial index for Google Maps / Route integration later
DestinationSchema.index({ "location.coordinates": "2dsphere" });

module.exports = mongoose.model("Destination", DestinationSchema);