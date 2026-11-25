const { isValidObjectId, sanitizePayload } = require("../utils/sanitizer");
const logger = require("../utils/logger");

/**
 * Middleware generator that validates specified route parameters to ensure they are valid MongoDB ObjectIds.
 * Returns 400 Bad Request if an invalid ObjectId is detected.
 */
const validateObjectIds = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const value = req.params[paramName] || req.query[paramName] || req.body[paramName];
      if (value !== undefined && value !== null && value !== "") {
        // Handle array of IDs or single ID
        const idsToCheck = Array.isArray(value) ? value : [value];
        for (const id of idsToCheck) {
          if (typeof id === "string" && !isValidObjectId(id)) {
            logger.logSecurityEvent(
              req,
              "INVALID_OBJECT_ID_REJECTED",
              `Rejected request with invalid ObjectId for parameter [${paramName}]: ${id}`,
              { paramName, value: id }
            );
            return res.status(400).json({
              success: false,
              message: `Invalid ID format for parameter: ${paramName}`,
            });
          }
        }
      }
    }
    next();
  };
};

/**
 * Global middleware that recursively sanitizes request body, query, and params.
 */
const sanitizeInputMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const isEmbedWrite = (req.method === "POST" && /^\/api\/embeds\/?$/i.test(req.path)) ||
      (req.method === "PUT" && /^\/api\/embeds\/[a-f0-9]{24}\/?$/i.test(req.path));
    const originalEmbed = isEmbedWrite ? req.body.embedCode : undefined;
    req.body = sanitizePayload(req.body);
    // The authorized embed controller validates this field separately.
    if (typeof originalEmbed === "string") req.body.embedCode = originalEmbed;
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizePayload(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizePayload(req.params);
  }
  next();
};

module.exports = {
  validateObjectIds,
  sanitizeInputMiddleware,
};
