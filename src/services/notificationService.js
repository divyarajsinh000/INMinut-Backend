const https = require("https");
const GuestUser = require("../models/GuestUser");
const getFirebaseAdmin = require("./firebaseAdmin");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const getIdStrings = (items = []) =>
  items.map((item) => String(item?._id || item)).filter(Boolean);

const isExpoPushToken = (token = "") =>
  typeof token === "string" &&
  (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));

const postJson = (url, payload, headers = {}) =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch (_) {
            parsed = data;
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const error = new Error(
              `Expo push request failed with status ${res.statusCode}`
            );
            error.response = parsed;
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });

const removeInvalidFcmTokens = async (tokens = [], responses = []) => {
  const invalidTokens = [];

  responses.forEach((response, index) => {
    const code = response.error?.code;
    if (
      !response.success &&
      [
        "messaging/invalid-registration-token",
        "messaging/registration-token-not-registered",
      ].includes(code)
    ) {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length > 0) {
    await GuestUser.updateMany(
      { fcmToken: { $in: invalidTokens } },
      { $set: { fcmToken: "", notificationsEnabled: false } }
    );

    await GuestUser.updateMany(
      { "devices.fcmToken": { $in: invalidTokens } },
      { $set: { "devices.$[device].fcmToken": "", "devices.$[device].notificationsEnabled": false } },
      { arrayFilters: [{ "device.fcmToken": { $in: invalidTokens } }] }
    );
  }
};

const removeInvalidExpoTokens = async (tokens = [], tickets = []) => {
  const invalidTokens = [];

  tickets.forEach((ticket, index) => {
    if (ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered") {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length > 0) {
    await GuestUser.updateMany(
      { expoPushToken: { $in: invalidTokens } },
      { $set: { expoPushToken: "", notificationsEnabled: false } }
    );

    await GuestUser.updateMany(
      { "devices.expoPushToken": { $in: invalidTokens } },
      { $set: { "devices.$[device].expoPushToken": "", "devices.$[device].notificationsEnabled": false } },
      { arrayFilters: [{ "device.expoPushToken": { $in: invalidTokens } }] }
    );
  }
};

const stripHtml = (html) => (html || "").replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim();

const buildNotificationPayload = (news, newsCityIds) => ({
  title: news.isBreaking ? `Breaking: ${news.title}` : news.title,
  body: stripHtml(news.description) || "New news update is available.",
  data: {
    type: "news",
    newsId: String(news._id),
    categoryId: String(news.category?._id || news.category || ""),
    cityIds: newsCityIds.join(","),
  },
});

const sendExpoPushNotifications = async (tokens, news, newsCityIds) => {
  const uniqueTokens = [...new Set(tokens.filter(isExpoPushToken))];
  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, skipped: true };
  }

  let sent = 0;
  let failed = 0;
  const payload = buildNotificationPayload(news, newsCityIds);
  const headers = {};

  // Only needed if you enabled Expo push security in EAS dashboard.
  if (process.env.EXPO_PUSH_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`;
  }

  for (const tokenChunk of chunkArray(uniqueTokens, 100)) {
    const messages = tokenChunk.map((token) => ({
      to: token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data,
      channelId: "breaking_news",
      priority: "high",
    }));

    const response = await postJson(EXPO_PUSH_URL, messages, headers);
    const tickets = Array.isArray(response?.data)
      ? response.data
      : response?.data
        ? [response.data]
        : [];

    tickets.forEach((ticket) => {
      if (ticket?.status === "ok") sent += 1;
      else failed += 1;
    });

    if (response?.errors?.length) {
      failed += response.errors.length;
      console.error("Expo push errors:", response.errors);
    }

    await removeInvalidExpoTokens(tokenChunk, tickets);
  }

  return { sent, failed, skipped: false };
};

const sendFcmNotifications = async (tokens, news, newsCityIds) => {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const firebaseAdmin = getFirebaseAdmin();
  if (!firebaseAdmin) {
    return { sent: 0, failed: 0, skipped: true, reason: "Firebase Admin not configured" };
  }

  let sent = 0;
  let failed = 0;
  const payload = buildNotificationPayload(news, newsCityIds);

  for (const tokenChunk of chunkArray(uniqueTokens, 500)) {
    const response = await firebaseAdmin.messaging().sendEachForMulticast({
      tokens: tokenChunk,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
      android: {
        priority: "high",
        notification: {
          channelId: "breaking_news",
          sound: "default",
          clickAction: "OPEN_NEWS",
        },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    });

    sent += response.successCount;
    failed += response.failureCount;
    await removeInvalidFcmTokens(tokenChunk, response.responses);
  }

  return { sent, failed, skipped: false };
};

const cityMatchesUser = (user, newsCityIds) => {
  if (!newsCityIds.length) return true;

  const prefs = (user.cityPreferences || []).map((city) => String(city?._id || city)).filter(Boolean);

  // Users with no selected city should still receive city-specific breaking/news alerts.
  if (!prefs.length) return true;

  return prefs.some((cityId) => newsCityIds.includes(cityId));
};

const collectEnabledDeviceTokens = (users = []) => {
  const expoTokens = [];
  const fcmTokens = [];

  users.forEach((user) => {
    const deviceEntries = [];

    // Legacy/latest root token support. Do not require root notificationsEnabled for
    // device records below; older records can have stale root false while device true.
    if ((user.expoPushToken || user.fcmToken) && user.notificationsEnabled !== false) {
      deviceEntries.push({
        expoPushToken: user.expoPushToken,
        fcmToken: user.fcmToken,
        notificationsEnabled: true,
      });
    }

    if (Array.isArray(user.devices)) {
      user.devices.forEach((device) => {
        if (device?.notificationsEnabled !== false) {
          deviceEntries.push(device);
        }
      });
    }

    deviceEntries.forEach((device) => {
      if (isExpoPushToken(device.expoPushToken)) {
        expoTokens.push(device.expoPushToken);
      } else if (device.fcmToken) {
        fcmTokens.push(device.fcmToken);
      }
    });
  });

  return {
    expoTokens: [...new Set(expoTokens)],
    fcmTokens: [...new Set(fcmTokens)],
  };
};

const sendNewsNotificationToGuests = async (news) => {
  const newsCityIds = getIdStrings(news.cities || []);

  // Do not filter by root notificationsEnabled here. A guest row can have multiple
  // device records, and each device has its own notificationsEnabled flag.
  const tokenQuery = {
    $or: [
      { expoPushToken: { $exists: true, $ne: "" } },
      { fcmToken: { $exists: true, $ne: "" } },
      { "devices.expoPushToken": { $exists: true, $ne: "" } },
      { "devices.fcmToken": { $exists: true, $ne: "" } },
    ],
  };

  const allTokenUsers = await GuestUser.find(tokenQuery).select(
    "expoPushToken fcmToken notificationsEnabled devices cityPreferences"
  );

  const users = allTokenUsers.filter((user) => cityMatchesUser(user, newsCityIds));
  const { expoTokens, fcmTokens } = collectEnabledDeviceTokens(users);

  console.log("Notification target summary:", {
    newsId: String(news._id),
    newsCityIds,
    matchedUsers: users.length,
    expoTokens: expoTokens.length,
    fcmTokens: fcmTokens.length,
  });

  const expoResult = await sendExpoPushNotifications(expoTokens, news, newsCityIds);
  const fcmResult = await sendFcmNotifications(fcmTokens, news, newsCityIds);

  return {
    success: true,
    sent: expoResult.sent + fcmResult.sent,
    failed: expoResult.failed + fcmResult.failed,
    skipped: expoResult.skipped && fcmResult.skipped,
    expo: expoResult,
    fcm: fcmResult,
    targets: {
      matchedUsers: users.length,
      expoTokens: expoTokens.length,
      fcmTokens: fcmTokens.length,
    },
  };
};

module.exports = {
  sendNewsNotificationToGuests,
  sendExpoPushNotifications,
  sendFcmNotifications,
};
