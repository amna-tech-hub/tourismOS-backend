// src/controllers/traveler/travelJournal.controller.js

const TravelJournal = require("../models/TravelJournal.model");
const Booking = require("../models/Booking.model");

// ============================================================
// CREATE JOURNAL
// ============================================================

exports.createJournal = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    // ========================================================
    // 1. VALIDATE BOOKING ID
    // ========================================================

    if (!bookingId) {
      return res.status(400).json({
        status: "fail",
        message: "Booking ID is required.",
      });
    }

    // ========================================================
    // 2. FIND BOOKING
    // ========================================================

    const booking = await Booking.findOne({
      _id: bookingId,
      isDeleted: { $ne: true },
    });

    if (!booking) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found.",
      });
    }

    // ========================================================
    // 3. VERIFY BOOKING OWNERSHIP
    // ========================================================

    const travelerId = booking.traveler
      ? booking.traveler.toString()
      : null;

    const currentUserId = req.user.id?.toString();

    if (!travelerId || travelerId !== currentUserId) {
      return res.status(403).json({
        status: "fail",
        message:
          "You can only create journals for your own bookings.",
      });
    }

    // ========================================================
    // 4. VERIFY BOOKING IS CONFIRMED + PAID
    // ========================================================

    if (
      booking.status !== "confirmed" ||
      booking.paymentStatus !== "paid"
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "You can only create a journal for a paid and confirmed booking.",
      });
    }

    // ========================================================
    // 5. CHECK IF JOURNAL ALREADY EXISTS
    // ========================================================

    const existingJournal = await TravelJournal.findOne({
      booking: booking._id,
      isDeleted: false,
    });

    if (existingJournal) {
      return res.status(400).json({
        status: "fail",
        message:
          "A travel journal already exists for this booking.",
        data: {
          journal: existingJournal,
        },
      });
    }

    // ========================================================
    // 6. CREATE JOURNAL
    // ========================================================

    const journal = await TravelJournal.create({
      booking: booking._id,
      traveler: booking.traveler,
      company: booking.company,
      tour: booking.tour,
      entries: [],
    });

    // ========================================================
    // 7. POPULATE JOURNAL FOR RESPONSE
    // ========================================================

    const populatedJournal =
      await TravelJournal.findById(journal._id)
        .populate(
          "tour",
          "title coverImage destination duration"
        )
        .populate(
          "company",
          "companyName logo"
        )
        .populate(
          "booking",
          "travelDate participants totalAmount status paymentStatus"
        );

    return res.status(201).json({
      status: "success",
      message:
        "Travel journal created successfully.",
      data: {
        journal: populatedJournal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// ADD JOURNAL ENTRY
// ============================================================

exports.addEntry = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      day,
      title,
      memory,
      photos = [],
      expenses = [],
    } = req.body;

    // ========================================================
    // 1. FIND JOURNAL + VERIFY OWNERSHIP
    // ========================================================

    const journal = await TravelJournal.findOne({
      _id: id,
      traveler: req.user.id,
      isDeleted: false,
    });

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal not found or unauthorized.",
      });
    }

    // ========================================================
    // 2. VALIDATE ENTRY
    // ========================================================

    if (!day || Number(day) < 1) {
      return res.status(400).json({
        status: "fail",
        message:
          "Valid day number is required.",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        status: "fail",
        message:
          "Entry title is required.",
      });
    }

    if (!memory?.trim()) {
      return res.status(400).json({
        status: "fail",
        message:
          "Memory story text is required.",
      });
    }

    // ========================================================
    // 3. CREATE ENTRY
    // ========================================================

    const newEntry = {
      day: Number(day),
      title: title.trim(),
      memory: memory.trim(),
      photos: Array.isArray(photos)
        ? photos
        : [],
      expenses: Array.isArray(expenses)
        ? expenses
        : [],
      createdAt: new Date(),
    };

    journal.entries.push(newEntry);

    await journal.save();

    // ========================================================
    // 4. RESPONSE
    // ========================================================

    return res.status(201).json({
      status: "success",
      message:
        "Journal entry added successfully.",
      data: {
        journal,
        entry:
          journal.entries[
            journal.entries.length - 1
          ],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UPDATE JOURNAL ENTRY
// ============================================================

exports.updateEntry = async (req, res, next) => {
  try {
    const { id, entryId } = req.params;

    const {
      day,
      title,
      memory,
      photos,
      expenses,
    } = req.body;

    // ========================================================
    // 1. FIND JOURNAL + VERIFY OWNERSHIP
    // ========================================================

    const journal = await TravelJournal.findOne({
      _id: id,
      traveler: req.user.id,
      isDeleted: false,
    });

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal not found or unauthorized.",
      });
    }

    // ========================================================
    // 2. FIND ENTRY
    // ========================================================

    const entry = journal.entries.id(entryId);

    if (!entry) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal entry not found.",
      });
    }

    // ========================================================
    // 3. VALIDATE DAY
    // ========================================================

    if (
      day !== undefined &&
      (day === "" || Number(day) < 1)
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "Valid day number is required.",
      });
    }

    // ========================================================
    // 4. VALIDATE TITLE
    // ========================================================

    if (
      title !== undefined &&
      !title?.trim()
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "Entry title is required.",
      });
    }

    // ========================================================
    // 5. VALIDATE MEMORY
    // ========================================================

    if (
      memory !== undefined &&
      !memory?.trim()
    ) {
      return res.status(400).json({
        status: "fail",
        message:
          "Memory story text is required.",
      });
    }

    // ========================================================
    // 6. UPDATE BASIC FIELDS
    // ========================================================

    if (day !== undefined) {
      entry.day = Number(day);
    }

    if (title !== undefined) {
      entry.title = title.trim();
    }

    if (memory !== undefined) {
      entry.memory = memory.trim();
    }

    // ========================================================
    // 7. UPDATE PHOTOS
    // ========================================================

    if (photos !== undefined) {
      if (!Array.isArray(photos)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Photos must be an array.",
        });
      }

      entry.photos = photos;
    }

    // ========================================================
    // 8. UPDATE EXPENSES
    // ========================================================

    if (expenses !== undefined) {
      if (!Array.isArray(expenses)) {
        return res.status(400).json({
          status: "fail",
          message:
            "Expenses must be an array.",
        });
      }

      entry.expenses = expenses;
    }

    // ========================================================
    // 9. SAVE
    // ========================================================

    await journal.save();

    // ========================================================
    // 10. RESPONSE
    // ========================================================

    return res.status(200).json({
      status: "success",
      message:
        "Journal entry updated successfully.",
      data: {
        journal,
        entry,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET MY JOURNALS
// ============================================================

exports.getMyJournals = async (req, res, next) => {
  try {
    const journals =
      await TravelJournal.find({
        traveler: req.user.id,
        isDeleted: false,
      })
        .populate(
          "tour",
          "title coverImage destination from to duration price"
        )
        .populate(
          "company",
          "companyName name logo"
        )
        .populate(
          "booking",
          "travelDate participants totalAmount status paymentStatus"
        )
        .sort("-createdAt");

    return res.status(200).json({
      status: "success",
      results: journals.length,
      data: {
        journals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// GET JOURNAL BY ID
// ============================================================

exports.getJournalById = async (
  req,
  res,
  next
) => {
  try {
    const journal =
      await TravelJournal.findOne({
        _id: req.params.id,
        traveler: req.user.id,
        isDeleted: false,
      })
        .populate(
          "tour",
          "title coverImage destination from to duration price"
        )
        .populate(
          "traveler",
          "name avatar"
        )
        .populate(
          "company",
          "companyName name logo"
        )
        .populate(
          "booking",
          "travelDate participants totalAmount status paymentStatus"
        );

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal not found or unauthorized.",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        journal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE JOURNAL ENTRY
// ============================================================

exports.deleteEntry = async (
  req,
  res,
  next
) => {
  try {
    const { id, entryId } =
      req.params;

    // ========================================================
    // 1. FIND JOURNAL
    // ========================================================

    const journal =
      await TravelJournal.findOne({
        _id: id,
        traveler: req.user.id,
        isDeleted: false,
      });

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal not found or unauthorized.",
      });
    }

    // ========================================================
    // 2. CHECK ENTRY
    // ========================================================

    const entryExists =
      journal.entries.some(
        (entry) =>
          entry._id.toString() ===
          entryId
      );

    if (!entryExists) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal entry not found.",
      });
    }

    // ========================================================
    // 3. DELETE ENTRY
    // ========================================================

    journal.entries =
      journal.entries.filter(
        (entry) =>
          entry._id.toString() !==
          entryId
      );

    await journal.save();

    return res.status(200).json({
      status: "success",
      message:
        "Journal entry removed successfully.",
      data: {
        journal,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// DELETE JOURNAL
// ============================================================

exports.deleteJournal = async (
  req,
  res,
  next
) => {
  try {
    const journal =
      await TravelJournal.findOneAndUpdate(
        {
          _id: req.params.id,
          traveler: req.user.id,
          isDeleted: false,
        },
        {
          isDeleted: true,
        },
        {
          new: true,
        }
      );

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message:
          "Journal not found or unauthorized.",
      });
    }

    return res.status(200).json({
      status: "success",
      message:
        "Travel journal deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createJournal:
    exports.createJournal,

  addEntry:
    exports.addEntry,

  updateEntry:
    exports.updateEntry,

  getMyJournals:
    exports.getMyJournals,

  getJournalById:
    exports.getJournalById,

  deleteEntry:
    exports.deleteEntry,

  deleteJournal:
    exports.deleteJournal,
};