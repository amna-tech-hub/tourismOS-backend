const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String, // e.g., "5-Day Hunza Adventure"
      required: true,
    },
    destination: {
      type: String, // Target region or city
      required: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    durationDays: {
      type: Number,
      required: true,
    },
    totalBudget: {
      type: Number, // PKRs
    },
   
    itinerary: [
      {
        dayNumber: { type: Number, required: true },
        theme: { type: String }, // e.g., "Cultural Discovery"
        activities: [
          {
            timeSlot: { type: String }, // e.g., "Morning", "Afternoon"
            activityName: { type: String, required: true },
            description: { type: String },
            estimatedCost: { type: Number },
            destinationRef: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Destination", // Link to actual DB entry if exists
            },
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ["draft", "saved", "completed"],
      default: "draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", TripSchema);