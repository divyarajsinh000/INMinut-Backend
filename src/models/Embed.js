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
    shareUrl: {
  type: String,
  trim: true,
  default: "",
},
    height: {
      type: Number,
      required: true,
      min: 80,
      max: 4000,
      default: 250,
    },
    width: { type: Number, min: 50, max: 2000, default: null },
    autoSize: { type: Boolean, default: false },
    widthMode: { type: String, enum: ["fill", "contain", "original"], default: "contain" },
    paddingHorizontal: { type: Number, min: 0, max: 50, default: 8 },
    paddingVertical: { type: Number, min: 0, max: 50, default: 8 },
    alignment: { type: String, enum: ["left", "center", "right"], default: "center" },
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
