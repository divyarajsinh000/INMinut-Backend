const logger = require("../utils/logger");

const INSECURE_JWT_SECRETS = [
  "your-secret-key",
  "your-strong-secret-key",
  "your-256-bit-secret-key-change-this-in-production",
  "secret",
  "secretkey",
  "123456",
  "password",
  "admin",
];

const validateEnv = () => {
  const errors = [];
  const warnings = [];

  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";

  // 1. Validate JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push("JWT_SECRET environment variable is missing.");
  } else {
    const lowerSecret = jwtSecret.toLowerCase().trim();
    if (INSECURE_JWT_SECRETS.includes(lowerSecret)) {
      if (isProduction) {
        errors.push(`JWT_SECRET is using a default insecure placeholder ("${jwtSecret}"). Replace it with a strong random secret.`);
      } else {
        warnings.push(`JWT_SECRET is set to a default development string ("${jwtSecret}"). Change this before deploying to production.`);
      }
    } else if (isProduction && jwtSecret.length < 32) {
      errors.push("JWT_SECRET must be at least 32 characters (256-bit) in production.");
    }
  }

  // 2. Validate MONGO_URI
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    errors.push("MONGO_URI environment variable is missing.");
  } else if (isProduction && (mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost"))) {
    warnings.push("MONGO_URI is pointing to local host in production. Ensure DB server is secured and firewalled.");
  }

  // 3. Validate PORT
  const port = process.env.PORT;
  if (port && (isNaN(Number(port)) || Number(port) <= 0 || Number(port) > 65535)) {
    errors.push(`Invalid PORT number: "${port}".`);
  }

  // Output warnings if any
  warnings.forEach((warn) => {
    logger.info(`[ENV WARNING] ${warn}`);
  });

  // Throw error and halt startup if critical errors exist
  if (errors.length > 0) {
    console.error("\n=======================================================");
    console.error("  CRITICAL ENVIRONMENT CONFIGURATION ERROR(S)");
    console.error("=======================================================");
    errors.forEach((err, idx) => {
      console.error(` ${idx + 1}. ${err}`);
    });
    console.error("=======================================================\n");
    throw new Error("Application failed startup validation due to insecure or missing environment configuration.");
  }

  logger.info(`Environment validation passed successfully (${nodeEnv} mode).`);
};

module.exports = validateEnv;
