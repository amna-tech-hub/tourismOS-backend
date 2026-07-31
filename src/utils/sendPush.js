const User = require('../models/User.model');
const { getMessaging } = require('firebase-admin/messaging'); // Import getMessaging

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
    const { recipientUserId, title, body, extraData } = req.body;

    const user = await User.findById(recipientUserId);
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return res.status(404).json({ success: false, message: 'User has no active device tokens' });
    }

    const message = {
      notification: { title, body },
      data: extraData || {},
      tokens: user.fcmTokens
    };

    // Use getMessaging() instead of admin.messaging()
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