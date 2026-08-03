const { getMessaging } = require("firebase-admin/messaging");
const User = require("../../models/User.model");
const Notification = require("../../models/Notification.model"); // In-App Notification Model

class NotificationService {
  /**
   * Sends a Push Notification + Saves In-App Notification for a User
   */
  async sendToUser(userId, { title, body, type = "SAFETY_ALERT", extraData = {} }) {
    try {
      // 1. Save In-App Notification to MongoDB
      await Notification.create({
        user: userId,
        title,
        body,
        type,
        data: extraData,
      });

      // 2. Fetch User's FCM Tokens
      const user = await User.findById(userId).select("fcmTokens");
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        console.log(`[Notification] No active FCM tokens for user: ${userId}`);
        return;
      }

      // 3. Prepare FCM Multicast Payload
      const message = {
        notification: { title, body },
        data: {
          type,
          ...extraData,
        },
        tokens: user.fcmTokens,
      };

      // 4. Send via Firebase Cloud Messaging
      const response = await getMessaging().sendEachForMulticast(message);
      console.log(
        `[FCM] Notification sent to ${userId}: ${response.successCount} success, ${response.failureCount} failed.`
      );

      // Clean up invalid/expired FCM tokens if any failed
      if (response.failureCount > 0) {
        this.#cleanInvalidTokens(user, response);
      }
    } catch (error) {
      console.error(`[Notification Error] Failed to notify user ${userId}:`, error.message);
    }
  }

  /**
   * Helper to remove dead/invalid FCM tokens automatically
   */
  async #cleanInvalidTokens(user, response) {
    const failedTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(user.fcmTokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await User.findByIdAndUpdate(user._id, {
        $pull: { fcmTokens: { $in: failedTokens } },
      });
      console.log(`[FCM Cleanup] Removed ${failedTokens.length} stale tokens for user ${user._id}`);
    }
  }
}

module.exports = new NotificationService();