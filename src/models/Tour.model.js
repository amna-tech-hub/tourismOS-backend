const mongoose = require("mongoose");
const baseFields = require("./base/base.schema");

// Updated Sub-schema for single day itinerary
const dayItinerarySchema = new mongoose.Schema({
  day: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String },

  // --- Updated Activities Array (Objects with optional image) ---
  activities: [
    {
      title: { type: String, required: true },
      image: {
        url: { type: String, default: null },
        public_id: { type: String, default: null },
      },
    },
  ],

  // --- Fields for Geocoding & Location ---
  location: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  isGeocoded: { type: Boolean, default: false },
  geocodeAttempts: { type: Number, default: 0 },
  geocodedAt: { type: Date, default: null },
});

// Sub-schema for Tour FAQs
const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
});

const tourSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    from: {
      type: String,
      required: [true, "Starting location (from) is required"],
      trim: true,
    },
    to: {
      type: String,
      required: [true, "Destination location (to) is required"],
      trim: true,
    },

    duration: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, "Rating must be above 0"],
      max: [5, "Rating must be below 5"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    maxParticipants: {
      type: Number,
      required: true,
    },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    coverImage: {
      url: { type: String },
      public_id: { type: String },
    },

    // Itinerary & AI Details
    itinerary: [dayItinerarySchema],

    budgetBreakdown: {
      hotel: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
    },

    travelTips: [{ type: String }],
    bestTimeToVisit: { type: String, trim: true },
    importantNotes: [{ type: String }],

    faqs: [faqSchema],

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    ...baseFields,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tour", tourSchema);