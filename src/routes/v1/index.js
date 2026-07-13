// src/routes/v1/index.js

const express = require('express');
const router = express.Router();

// Health check for v1
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API v1 is working!',
        version: 'v1',
        timestamp: new Date().toISOString(),
        requestId: req.id,
    });
});

// Testing route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test route is working!',
        requestId: req.id,
    });
});

module.exports = router;