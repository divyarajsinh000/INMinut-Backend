const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: "Advertisement",
    },
    bannerImage: {
      type: String,
      required: true,
    },
    redirectUrl: {
      type: String,
      required: true,
      trim: true,
    },
    // Empty cities array means this advertisement is global and visible to all city users.
    cities: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "City" }],
      default: [],
      index: true,
    },
    positionAfterNews: {
      type: Number,
      default: 4,
      min: 1,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Advertisement", advertisementSchema);
