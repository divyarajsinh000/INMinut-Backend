const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    appLogo: {
      type: String,
      default: "",
    },
    appIcon: {
      type: String,
      default: "",
    },
    defaultNewsImage: {
      type: String,
      default: "",
    },
    appUpdates: {
      android: {
        latestVersion: { type: String, default: '' },
        minimumVersion: { type: String, default: '' },
        storeUrl: { type: String, default: '' },
      },
      ios: {
        latestVersion: { type: String, default: '' },
        minimumVersion: { type: String, default: '' },
        storeUrl: { type: String, default: '' },
      },
      updateMessage: { type: String, default: 'A new version of INMinut is available.' },
    },
    defaultShareImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
