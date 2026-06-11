const mongoose = require("mongoose");

const guestDeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      trim: true,
      default: "",
    },
    fcmToken: {
      type: String,
      trim: true,
      default: "",
    },
    expoPushToken: {
      type: String,
      trim: true,
      default: "",
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
    },
    deviceName: {
      type: String,
      default: "Unknown device",
      trim: true,
    },
    appVersion: {
      type: String,
      default: "",
      trim: true,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const guestUserSchema = new mongoose.Schema(
  {
    guestId: {
      type: String,
      required: true,
      trim: true,
    },

    // Latest-device summary fields kept only for old admin/mobile compatibility.
    // Do NOT make these unique because Expo Go/Firebase may send blank fcmToken.
    fcmToken: {
      type: String,
      trim: true,
      default: "",
    },
    expoPushToken: {
      type: String,
      trim: true,
      default: "",
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
    },
    deviceName: {
      type: String,
      default: "Unknown device",
      trim: true,
    },
    appVersion: {
      type: String,
      default: "",
      trim: true,
    },

    devices: {
      type: [guestDeviceSchema],
      default: [],
    },

    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    cityPreferences: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "City" }],
      default: [],
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Keep only safe indexes here. No duplicate `index: true` on fields above.
guestUserSchema.index({ guestId: 1 }, { unique: true });
guestUserSchema.index({ cityPreferences: 1 });
guestUserSchema.index({ "devices.deviceId": 1 }, { sparse: true });
guestUserSchema.index({ "devices.expoPushToken": 1 }, { sparse: true });
guestUserSchema.index({ "devices.fcmToken": 1 }, { sparse: true });

module.exports = mongoose.model("GuestUser", guestUserSchema);
