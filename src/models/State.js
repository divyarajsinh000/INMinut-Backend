const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

stateSchema.index({ name: 1, country: 1 }, { unique: true });

module.exports = mongoose.model("State", stateSchema);
