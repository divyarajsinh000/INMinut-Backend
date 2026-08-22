const dns = require("dns");
const mongoose = require("mongoose");
const ensureGuestUserIndexes = require("../utils/ensureGuestUserIndexes");
const logger = require("../utils/logger");

// Force Node.js DNS to use public DNS servers.
// This fixes MongoDB Atlas SRV lookup issues on some networks.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const maskMongoUri = (uri) => {
  if (!uri) return "N/A";
  return uri.replace(/\/\/(.*?)@/, "//***:***@");
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env file");
    }

    const options = {
      serverSelectionTimeoutMS: 5000,
      autoIndex: process.env.NODE_ENV !== "production",
    };

    mongoose.connection.on("error", (err) => {
      logger.error("Mongoose background connection error:", { message: err.message });
    });

    const conn = await mongoose.connect(mongoUri, options);

    const maskedHost = conn.connection.host ? conn.connection.host.replace(/\..*$/, ".***") : "local-cluster";
    logger.info(`MongoDB connected successfully to cluster target (${maskedHost})`);

    await ensureGuestUserIndexes();
  } catch (error) {
    logger.error("MongoDB connection failed:", { message: error.message });
    console.error("MongoDB connection failed:", error.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

module.exports = connectDB;