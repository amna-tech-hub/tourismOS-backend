const express = require("express");

const router = express.Router();

const notificationController =
  require("../controllers/notification.controller");

const isAuth =
  require("../middleware/authorization.middleware");


// ==========================================
// FCM TOKEN
// ==========================================

router.post(
  "/save-token",
  isAuth,
  notificationController.saveFcmToken
);

router.delete(
  "/fcm-token",
  isAuth,
  notificationController.removeFcmToken
);


// ==========================================
// NOTIFICATIONS
// ==========================================

router.get(
  "/",
  isAuth,
  notificationController.getMyNotifications
);

router.get(
  "/unread-count",
  isAuth,
  notificationController.getUnreadNotificationCount
);

router.patch(
  "/:notificationId/read",
  isAuth,
  notificationController.markAsRead
);

router.patch(
  "/read-all",
  isAuth,
  notificationController.markAllAsRead
);


// ==========================================
// TEST
// ==========================================

router.post(
  "/send-user",
  isAuth,
  notificationController.sendPushToUser
);

module.exports = router;