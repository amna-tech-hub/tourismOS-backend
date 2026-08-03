const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const isAuth = require('../middleware/authorization.middleware'); // Your JWT auth middleware

// Endpoint for frontend dev to register device token
router.post('/save-token', isAuth, notificationController.saveFcmToken);

// Endpoint for testing or admin manual push
router.post('/send-user', isAuth, notificationController.sendPushToUser);
router.delete('/fcm-token', isAuth, notificationController.removeFcmToken);
module.exports = router;