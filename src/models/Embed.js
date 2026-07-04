const mongoose = require("mongoose");

const embedSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    embedCode: {
      type: String,
      required: true,
    },
    height: {
      type: Number,
      required: true,
      min: 1,
      default: 250,
    },
    positionAfterNews: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
      default: [],
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Embed", embedSchema);
