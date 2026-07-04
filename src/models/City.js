const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true, index: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: "Country", required: true, index: true },
    sequence: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

citySchema.index({ name: 1, state: 1, country: 1 }, { unique: true });

module.exports = mongoose.model("City", citySchema);
