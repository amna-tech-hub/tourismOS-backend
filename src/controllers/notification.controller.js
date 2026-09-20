const User = require('../models/User.model');
const Notification =require('../models/Notification.model')
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
const notificationService = require("../services/notification/notification.service");

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

    await notificationService.sendToUser(recipientUserId, {
      title,
      body,
      type,
      extraData,
    });

    return res.status(200).json({
      success: true,
      message: "Notification processed successfully",
    });
  } catch (error) {
    console.error("Error sending push notification:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
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



// GET MY NOTIFICATIONS

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({
      user: userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error(
      "Error fetching notifications:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ==========================================
// GET UNREAD COUNT
// ==========================================

exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(
      "Error fetching unread notification count:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ==========================================
// MARK ONE AS READ
// ==========================================

exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: notificationId,
          user: userId,
        },
        {
          isRead: true,
        },
        {
          new: true,
        }
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(
      "Error marking notification as read:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// ==========================================
// MARK ALL AS READ
// ==========================================

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      {
        user: userId,
        isRead: false,
      },
      {
        isRead: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Error marking all notifications as read:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};