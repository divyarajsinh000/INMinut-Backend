const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video", "pdf"],
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
});

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    titleLink: {
      type: String,
      default: "",
      trim: true,
    },
    titleColor: {
      type: String,
      default: "#111827",
      trim: true,
    },
    titleFontSize: {
      type: Number,
      default: 22,
      min: 10,
      max: 60,
    },
    description: {
      type: String,
      trim: true,
    },
    descriptionFontSize: {
      type: Number,
      default: 16,
      min: 10,
      max: 40,
    },
    content: {
      type: String,
      trim: true,
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    cities: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "City" }],
      default: [],
      index: true,
    },
    reporter: {
      name: {
        type: String,
      },
      avatar: {
        type: String,
      },
    },
    hashtags: {
      type: [String],
      default: [],
    },
    isBreaking: {
      type: Boolean,
      default: false,
    },
    breakingText: {
      type: String,
      default: "Breaking News",
      trim: true,
      maxlength: 80,
    },
    breakingBgColor: {
      type: String,
      default: "#EF4444",
      trim: true,
    },
    breakingTextColor: {
      type: String,
      default: "#FFFFFF",
      trim: true,
    },
    isBreakingBlink: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinOrder: {
      type: Number,
      default: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    saveCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      index: true,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("News", newsSchema);
