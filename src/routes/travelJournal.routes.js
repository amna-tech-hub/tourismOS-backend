const express = require("express");

const router = express.Router();

const travelJournalController = require("../controllers/travelJournal.controller");
const { restrictTo } = require("../middleware/role.middleware");
const protect =require("../middleware/authorization.middleware")
// ============================================================
// JOURNALS
// ============================================================

// Create journal
router.post(
  "/",
  protect,
  travelJournalController.createJournal
);

// Get my journals
router.get(
  "/",
  protect,
  travelJournalController.getMyJournals
);

// Get journal detail
router.get(
  "/:id",
  protect,
  travelJournalController.getJournalById
);

// Delete journal
router.delete(
  "/:id",
  protect,
  travelJournalController.deleteJournal
);

// ============================================================
// JOURNAL ENTRIES
// ============================================================

// Add entry
router.post(
  "/:id/entries",
  protect,
  travelJournalController.addEntry
);

// Update entry
router.patch(
  "/:id/entries/:entryId",
  protect,
  travelJournalController.updateEntry
);

// Delete entry
router.delete(
  "/:id/entries/:entryId",
  protect,
  travelJournalController.deleteEntry
);

module.exports = router;