const mongoose = require("mongoose");
const baseFields = require("./base/base.schema");

// Sub-schema for single day itinerary
const dayItinerarySchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  activities: [{ type: String }],
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
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number, // in days
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    ratingsAverage: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be above 0'],
    max: [5, 'Rating must be below 5'],
    set: (val) => Math.round(val * 10) / 10, // Rounds e.g. 4.6666 to 4.7
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

    //  Itinerary & AI Details
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