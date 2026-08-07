const mongoose = require("mongoose");

const expenseCategoryEnum = [
  "food",
  "hotel",
  "transport",
  "shopping",
  "activities",
  "other",
];

const journalEntrySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: [true, "Day number is required"],
      min: [1, "Day number must be at least 1"],
    },
    title: {
      type: String,
      trim: true,
      required: [true, "Entry title is required"],
    },
    memory: {
      type: String,
      trim: true,
      required: [true, "Memory story text is required"],
    },
    photos: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    expenses: [
      {
        category: {
          type: String,
          enum: {
            values: expenseCategoryEnum,
            message: "Invalid expense category",
          },
          required: true,
        },
        amount: {
          type: Number,
          required: [true, "Expense amount is required"],
          min: [0, "Amount cannot be negative"],
        },
        note: {
          type: String,
          trim: true,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const travelJournalSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking ID is required"],
      unique: true, // One journal per completed booking
    },
    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Traveler ID is required"],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company ID is required"],
    },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tour",
      required: [true, "Tour ID is required"],
    },
    entries: [journalEntrySchema],
    isPublic: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
travelJournalSchema.index({ traveler: 1, isDeleted: 1 });
// travelJournalSchema.index({ booking: 1 });
travelJournalSchema.index({ tour: 1, isPublic: 1 });

const TravelJournal = mongoose.model("TravelJournal", travelJournalSchema);

module.exports = TravelJournal;