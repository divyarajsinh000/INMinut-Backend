const mongoose = require("mongoose");

  const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    backgroundColor: {
      type: String,
      default: "#FF6B35",
    },
    textColor: {
      type: String,
      default: "#FFFFFF",
    },
    sequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Category", categorySchema);
