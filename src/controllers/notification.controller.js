const User = require('../models/User.model');
const admin = require('../config/firebase.config');
const { getMessaging } = require('firebase-admin/messaging');
// 1. Save or Update FCM Token from Frontend
exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id; // From your auth middleware (JWT)

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    // Add token if it's not already in the user's fcmTokens array
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
    const { recipientUserId, title, body, extraData } = req.body;

    const user = await User.findById(recipientUserId);
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return res.status(404).json({ success: false, message: 'User has no active device tokens' });
    }

    // Prepare payload (using sendMulticast in case user has multiple logged-in devices)
    const message = {
      notification: { title, body },
      data: extraData || {}, // e.g. { orderId: "12345", type: "ORDER_STATUS" }
      tokens: user.fcmTokens
    };

const response = await getMessaging().sendEachForMulticast(message);
    return res.status(200).json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.removeFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id; 

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    // $pull removes all instances of fcmToken from the array matching the token value
    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: fcmToken }
    });

    return res.status(200).json({
      success: true,
      message: 'FCM Token removed successfully'
    });
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};