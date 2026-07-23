const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company ID is required."],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
      unique: true, // Ensures a user can only have one employee record
      index: true,
    },
    designation: {
      type: String,
      trim: true,
      default: "Employee",
    },
    department: {
      type: String,
      trim: true,
      default: "General",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "{VALUE} is not a valid employee status.",
      },
      default: "active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch active employees for a specific company
// employeeSchema.index({ company: 1, status: 1 });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;