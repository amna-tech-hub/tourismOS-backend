// src/routes/index.js

const express = require('express');
const router = express.Router();

// Import v1 routes
const v1Routes = require('./v1');

// Mount v1 routes at /api/v1
router.use('/v1', v1Routes);

module.exports = router;