const TravelJournal = require("../models/TravelJournal.model");
const Booking = require("../models/Booking.model");


exports.createJournal = async (req, res, next) => {
  try {
    const { bookingId, isPublic } = req.body;

    // 1. Fetch booking and verify ownership + completed status
    const booking = await Booking.findById(bookingId);

    if (!booking || booking.isDeleted) {
      return res.status(404).json({
        status: "fail",
        message: "Booking not found.",
      });
    }

    // Safely extract IDs as strings for direct comparison
    const travelerId = booking.traveler ? booking.traveler.toString() : null;
    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id;

    if (travelerId !== currentUserId) {
      return res.status(403).json({
        status: "fail",
        message: "You can only create journals for your own bookings.",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        status: "fail",
        message: "You can only create a journal for confirmed tours.",
      });
    }

    // Check if a journal already exists for this booking
    const existingJournal = await TravelJournal.findOne({ booking: bookingId, isDeleted: false });
    if (existingJournal) {
      return res.status(400).json({
        status: "fail",
        message: "A travel journal already exists for this booking.",
      });
    }

    //  Create journal document
    const journal = await TravelJournal.create({
      booking: booking._id,
      traveler: req.user.id,
      company: booking.company,
      tour: booking.tour,
      isPublic: isPublic || false,
      entries: [],
    });

    res.status(201).json({
      status: "success",
      message: "Travel journal initialized successfully.",
      data: { journal },
    });
  } catch (error) {
    next(error);
  }
};


exports.addEntry = async (req, res, next) => {
  try {
    console.log("add entry");
    
    const { id } = req.params;
    const { day, title, memory, photos, expenses } = req.body;
console.log(id,title);

    const journal = await TravelJournal.findOne({
      _id: id,
      traveler: req.user.id,
      isDeleted: false,
    });

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message: "Journal not found or unauthorized.",
      });
    }

    const newEntry = {
      day,
      title,
      memory,
      photos: photos || [],
      expenses: expenses || [],
      createdAt: new Date(),
    };

    journal.entries.push(newEntry);
    await journal.save();

    res.status(200).json({
      status: "success",
      message: "Journal entry added successfully.",
      data: { journal },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyJournals = async (req, res, next) => {
  try {
    const journals = await TravelJournal.find({
      traveler: req.user.id,
      isDeleted: false,
    })
      .populate("tour", "title coverImage destination")
      .populate("company", "companyName logo")
      .sort("-createdAt");

    res.status(200).json({
      status: "success",
      results: journals.length,
      data: { journals },
    });
  } catch (error) {
    next(error);
  }
};


exports.getJournalById = async (req, res, next) => {
  try {
    const journal = await TravelJournal.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate("tour", "title coverImage destination duration")
      .populate("traveler", "name avatar");

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message: "Journal not found.",
      });
    }

    // Access check: owner or public journal
    const isOwner = req.user && journal.traveler._id.toString() === req.user._id.toString();
    if (!journal.isPublic && !isOwner) {
      return res.status(403).json({
        status: "fail",
        message: "This journal is private.",
      });
    }

    res.status(200).json({
      status: "success",
      data: { journal },
    });
  } catch (error) {
    next(error);
  }
};


exports.updateJournal = async (req, res, next) => {
  try {
    const { isPublic } = req.body;

    const journal = await TravelJournal.findOneAndUpdate(
      { _id: req.params.id, traveler: req.user._id, isDeleted: false },
      { isPublic },
      { new: true, runValidators: true }
    );

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message: "Journal not found or unauthorized.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Journal updated successfully.",
      data: { journal },
    });
  } catch (error) {
    next(error);
  }
};


exports.deleteEntry = async (req, res, next) => {
  try {
    const { id, entryId } = req.params;

    const journal = await TravelJournal.findOne({
      _id: id,
      traveler: req.user.id,
      isDeleted: false,
    });

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message: "Journal not found or unauthorized.",
      });
    }

    journal.entries = journal.entries.filter(
      (entry) => entry._id.toString() !== entryId
    );

    await journal.save();

    res.status(200).json({
      status: "success",
      message: "Entry removed successfully.",
      data: { journal },
    });
  } catch (error) {
    next(error);
  }
};


exports.deleteJournal = async (req, res, next) => {
  try {
    const journal = await TravelJournal.findOneAndUpdate(
      { _id: req.params.id, traveler: req.user._id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!journal) {
      return res.status(404).json({
        status: "fail",
        message: "Journal not found or unauthorized.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Travel journal deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};