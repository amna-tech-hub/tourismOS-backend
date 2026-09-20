const { getMessaging } = require("firebase-admin/messaging");
const User = require("../../models/User.model");
const Notification = require("../../models/Notification.model");

class NotificationService {
  async sendToUser(
    userId,
    {
      title,
      body,
      type = "GENERAL",
      extraData = {},
    }
  ) {
    try {
      // ==========================================
      // 1. SAVE IN-APP NOTIFICATION
      // ==========================================

      await Notification.create({
        user: userId,
        title,
        body,
        type,
        data: extraData,
      });

      // ==========================================
      // 2. GET USER FCM TOKENS
      // ==========================================

      const user = await User.findById(userId).select("fcmTokens");

      if (!user || !user.fcmTokens?.length) {
        console.log(
          `[Notification] No active FCM tokens for user: ${userId}`
        );

        return {
          notificationSaved: true,
          pushSent: false,
          successCount: 0,
          failureCount: 0,
        };
      }

      // ==========================================
      // 3. FCM DATA MUST CONTAIN STRINGS
      // ==========================================

      const stringifiedData = Object.fromEntries(
        Object.entries(extraData).map(([key, value]) => [
          key,
          String(value),
        ])
      );

      // ==========================================
      // 4. CREATE FCM MESSAGE
      // ==========================================

      const message = {
        notification: {
          title,
          body,
        },

        data: {
          type,
          ...stringifiedData,
        },

        tokens: user.fcmTokens,
      };

      // ==========================================
      // 5. SEND PUSH
      // ==========================================

      const response =
        await getMessaging().sendEachForMulticast(message);

      console.log(
        `[FCM] Notification sent to ${userId}: ` +
          `${response.successCount} success, ` +
          `${response.failureCount} failed.`
      );

      // ==========================================
      // 6. REMOVE INVALID TOKENS
      // ==========================================

      if (response.failureCount > 0) {
        await this.#cleanInvalidTokens(user, response);
      }

      // ==========================================
      // 7. RETURN RESULT
      // ==========================================

      return {
        notificationSaved: true,
        pushSent: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error(
        `[Notification Error] Failed to notify user ${userId}:`,
        error.message
      );

      throw error;
    }
  }

  // ==========================================
  // CLEAN INVALID FCM TOKENS
  // ==========================================

  async #cleanInvalidTokens(user, response) {
    const failedTokens = [];

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;

        if (
          errorCode ===
            "messaging/invalid-registration-token" ||
          errorCode ===
            "messaging/registration-token-not-registered"
        ) {
          failedTokens.push(user.fcmTokens[index]);
        }
      }
    });

    if (!failedTokens.length) {
      return;
    }

    await User.findByIdAndUpdate(user._id, {
      $pull: {
        fcmTokens: {
          $in: failedTokens,
        },
      },
    });

    console.log(
      `[FCM Cleanup] Removed ${failedTokens.length} stale tokens`
    );
  }
}

module.exports = new NotificationService();