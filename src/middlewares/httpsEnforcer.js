const logger = require("../utils/logger");

const httpsEnforcer = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const isHttps =
      req.secure ||
      req.headers["x-forwarded-proto"] === "https" ||
      req.connection?.encrypted;

    if (!isHttps) {
      logger.logSecurityEvent(
        req,
        "UNENCRYPTED_HTTP_ATTEMPT",
        "Rejected unencrypted HTTP request in production environment"
      );

      if (req.method === "GET" || req.method === "HEAD") {
        const host = req.headers.host || "localhost";
        return res.redirect(301, `https://${host}${req.originalUrl || req.url}`);
      }

      return res.status(403).json({
        success: false,
        message: "HTTPS is strictly required for secure deployment. Unencrypted HTTP requests are disabled.",
      });
    }
  }

  next();
};

module.exports = httpsEnforcer;
