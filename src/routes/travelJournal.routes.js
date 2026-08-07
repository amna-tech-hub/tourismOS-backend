const express = require("express");
const router = express.Router();
const travelJournalController = require("../controllers/travelJournal.controller");
const isAuth = require("../middleware/authorization.middleware"); 
const restrictTo = require("../middleware/role.middleware"); 
router.use(isAuth);

router
  .route("/")
  .post(restrictTo("traveler"), travelJournalController.createJournal);

router
  .route("/")
  .get(restrictTo("traveler"), travelJournalController.getMyJournals);

router
  .route("/:id")
  .get(travelJournalController.getJournalById)
  .patch(restrictTo("traveler"), travelJournalController.updateJournal)
  .delete(restrictTo("traveler"), travelJournalController.deleteJournal);

router
  .route("/:id/entries")
  .post(restrictTo("traveler"), travelJournalController.addEntry);

router
  .route("/:id/entries/:entryId")
  .delete(restrictTo("traveler"), travelJournalController.deleteEntry);

module.exports = router;