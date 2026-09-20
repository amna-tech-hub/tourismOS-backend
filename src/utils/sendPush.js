const User = require('../models/User.model');
const notificationService = require('../services/notification/notification.service');

// 1. Save or Update FCM Token from Frontend
exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { fcmTokens: fcmToken }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'FCM Token saved successfully' 
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Send Notification to a Specific User
exports.sendPushToUser = async (req, res) => {
  try {
    const {
      recipientUserId,
      title,
      body,
      type = "GENERAL",
      extraData = {},
    } = req.body;

    if (!recipientUserId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: "recipientUserId, title and body are required",
      });
    }

    const result = await notificationService.sendToUser(
      recipientUserId,
      {
        title,
        body,
        type,
        extraData,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error sending notification:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};