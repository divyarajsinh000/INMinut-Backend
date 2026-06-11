const crypto = require("crypto");
const GuestUser = require("../models/GuestUser");

const normalizeCityPreferences = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeToken = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const makeDeviceId = ({ deviceId, expoPushToken, fcmToken, platform, deviceName }) => {
  const cleanDeviceId = normalizeString(deviceId);
  if (cleanDeviceId) return cleanDeviceId;

  // Fallback for old mobile builds. New mobile build sends a stable deviceId.
  const raw = [expoPushToken || "", fcmToken || "", platform || "unknown", deviceName || "Unknown device"].join("|");
  return `device_${crypto.createHash("sha1").update(raw).digest("hex")}`;
};

const sameDevice = (device, incoming) => {
  if (!device) return false;

  // Device id is the strongest identity. Token match is kept for Expo Go clear-data cases,
  // where AsyncStorage may reset but the Expo token can still be same/old.
  if (incoming.deviceId && device.deviceId && device.deviceId === incoming.deviceId) return true;
  if (incoming.expoPushToken && device.expoPushToken && device.expoPushToken === incoming.expoPushToken) return true;
  if (incoming.fcmToken && device.fcmToken && device.fcmToken === incoming.fcmToken) return true;

  return false;
};

const buildDevicePayload = ({
  deviceId,
  fcmToken,
  expoPushToken,
  platform,
  deviceName,
  appVersion,
  notificationsEnabled,
}) => ({
  deviceId: deviceId || "",
  fcmToken: normalizeToken(fcmToken),
  expoPushToken: normalizeToken(expoPushToken),
  platform: platform || "unknown",
  deviceName: deviceName || "Unknown device",
  appVersion: appVersion || "",
  notificationsEnabled: notificationsEnabled !== false,
  lastSeenAt: new Date(),
});

const syncDevice = (guestUser, devicePayload) => {
  if (!Array.isArray(guestUser.devices)) guestUser.devices = [];

  const existingDevice = guestUser.devices.find((device) => sameDevice(device, devicePayload));

  if (existingDevice) {
    existingDevice.deviceId = devicePayload.deviceId || existingDevice.deviceId || "";
    existingDevice.fcmToken = devicePayload.fcmToken || existingDevice.fcmToken || "";
    existingDevice.expoPushToken = devicePayload.expoPushToken || existingDevice.expoPushToken || "";
    existingDevice.platform = devicePayload.platform || existingDevice.platform || "unknown";
    existingDevice.deviceName = devicePayload.deviceName || existingDevice.deviceName || "Unknown device";
    existingDevice.appVersion = devicePayload.appVersion || existingDevice.appVersion || "";
    existingDevice.notificationsEnabled = devicePayload.notificationsEnabled !== false;
    existingDevice.lastSeenAt = new Date();
  } else {
    guestUser.devices.push(devicePayload);
  }
};

const findExistingGuestForDevice = async ({ guestId, deviceId, expoPushToken, fcmToken }) => {
  const or = [];

  if (deviceId) or.push({ "devices.deviceId": deviceId });
  if (expoPushToken) or.push({ expoPushToken }, { "devices.expoPushToken": expoPushToken });
  if (fcmToken) or.push({ fcmToken }, { "devices.fcmToken": fcmToken });

  if (or.length) {
    const byDevice = await GuestUser.findOne({ $or: or });
    if (byDevice) return byDevice;
  }

  if (guestId) return GuestUser.findOne({ guestId });
  return null;
};


const isDuplicateKeyError = (error) => error && error.code === 11000;

const registerGuestUser = async (req, res) => {
  try {
    const {
      guestId: rawGuestId,
      deviceId: rawDeviceId,
      fcmToken: rawFcmToken,
      expoPushToken: rawExpoPushToken,
      platform,
      deviceName,
      appVersion,
      notificationsEnabled,
      cityPreferences,
    } = req.body;

    const fcmToken = normalizeToken(rawFcmToken);
    const expoPushToken = normalizeToken(rawExpoPushToken);
    const deviceId = makeDeviceId({ deviceId: rawDeviceId, expoPushToken, fcmToken, platform, deviceName });
    const guestId = normalizeString(rawGuestId) || `guest_${deviceId}`;

    if (!guestId || (!fcmToken && !expoPushToken)) {
      return res.status(400).json({
        success: false,
        message: "guestId and at least one push token are required",
      });
    }

    const now = new Date();
    const devicePayload = buildDevicePayload({
      deviceId,
      fcmToken,
      expoPushToken,
      platform,
      deviceName,
      appVersion,
      notificationsEnabled,
    });

    // Critical for multi-device: find existing by device/token first, then guestId.
    // This prevents duplicate stale records and also prevents two devices from overwriting
    // one another when Expo Go/AsyncStorage behaves differently after clearing app data.
    let guestUser = await findExistingGuestForDevice({ guestId, deviceId, expoPushToken, fcmToken });

    if (!guestUser) {
      guestUser = new GuestUser({
        guestId,
        fcmToken,
        expoPushToken,
        platform: platform || "unknown",
        deviceName: deviceName || "Unknown device",
        appVersion: appVersion || "",
        notificationsEnabled: notificationsEnabled !== false,
        cityPreferences: cityPreferences !== undefined ? normalizeCityPreferences(cityPreferences) : [],
        lastSeenAt: now,
        devices: [devicePayload],
      });
    } else {
      // Keep root fields as latest-device summary only.
      guestUser.fcmToken = fcmToken || guestUser.fcmToken || "";
      guestUser.expoPushToken = expoPushToken || guestUser.expoPushToken || "";
      guestUser.platform = platform || guestUser.platform || "unknown";
      guestUser.deviceName = deviceName || guestUser.deviceName || "Unknown device";
      guestUser.appVersion = appVersion || guestUser.appVersion || "";
      guestUser.notificationsEnabled = notificationsEnabled !== false;
      guestUser.lastSeenAt = now;

      if (cityPreferences !== undefined) {
        guestUser.cityPreferences = normalizeCityPreferences(cityPreferences);
      }

      syncDevice(guestUser, devicePayload);
    }

    await guestUser.save();
    await guestUser.populate("cityPreferences");

    return res.status(200).json({
      success: true,
      message: "Guest user registered successfully",
      data: guestUser,
    });
  } catch (error) {
    console.error("Register guest user error:", error);

    if (isDuplicateKeyError(error)) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate MongoDB index error. Restart backend once so obsolete fcmToken/expoPushToken indexes are dropped, then try again.",
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
      });
    }

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateGuestNotificationPreference = async (req, res) => {
  try {
    const { guestId } = req.params;
    const { deviceId } = req.body;
    const $set = { lastSeenAt: new Date() };

    if (req.body.notificationsEnabled !== undefined) {
      const enabled = Boolean(req.body.notificationsEnabled);
      $set.notificationsEnabled = enabled;

      if (deviceId) {
        await GuestUser.updateOne(
          { guestId, "devices.deviceId": deviceId },
          { $set: { "devices.$.notificationsEnabled": enabled, "devices.$.lastSeenAt": new Date() } }
        );
      } else {
        $set["devices.$[].notificationsEnabled"] = enabled;
      }
    }

    if (req.body.cityPreferences !== undefined) {
      $set.cityPreferences = normalizeCityPreferences(req.body.cityPreferences);
    }

    const guestUser = await GuestUser.findOneAndUpdate({ guestId }, { $set }, { new: true }).populate("cityPreferences");

    if (!guestUser) {
      return res.status(404).json({ success: false, message: "Guest user not found" });
    }

    return res.json({
      success: true,
      message: "Guest preference updated",
      data: guestUser,
    });
  } catch (error) {
    console.error("Update guest preference error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getGuestUsers = async (req, res) => {
  try {
    const users = await GuestUser.find().populate("cityPreferences").sort({ lastSeenAt: -1 });
    return res.json({ success: true, data: users });
  } catch (error) {
    console.error("Get guest users error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteGuestUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await GuestUser.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "Guest user not found" });
    }

    return res.json({ success: true, message: "Guest user deleted" });
  } catch (error) {
    console.error("Delete guest user error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  registerGuestUser,
  updateGuestNotificationPreference,
  getGuestUsers,
  deleteGuestUser,
};
