const dns = require("dns");
const mongoose = require("mongoose");
const ensureGuestUserIndexes = require("../utils/ensureGuestUserIndexes");

// Force Node.js DNS to use public DNS servers.
// This fixes MongoDB Atlas SRV lookup issues on some networks.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${conn.connection.host}`);

    await ensureGuestUserIndexes();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;