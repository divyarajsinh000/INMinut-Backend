const mongoose = require("mongoose");

const newsInteractionSchema = new mongoose.Schema(
  {
    news: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
      required: true,
      index: true,
    },
    guestId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["view", "save", "unsave", "share", "like", "unlike"],
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

newsInteractionSchema.index({ news: 1, guestId: 1, action: 1 });
newsInteractionSchema.index({ news: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model("NewsInteraction", newsInteractionSchema);
