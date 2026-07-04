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
    defaultShareImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
