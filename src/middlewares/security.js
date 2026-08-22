const helmet = require("helmet");
const compression = require("compression");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const httpsEnforcer = require("./httpsEnforcer");
const logger = require("../utils/logger");

const createRateLimitHandler = (limiterName, maxHits) => {
  return (req, res, next, options) => {
    logger.logSecurityEvent(
      req,
      "RATE_LIMIT_EXCEEDED",
      `Rate limit exceeded for [${limiterName}]. Max allowed: ${maxHits} requests per window.`,
      { limiterName, maxHits }
    );
    res.status(options.statusCode || 429).json(
      options.message || {
        success: false,
        message: "Too many requests. Please try again later.",
      }
    );
  };
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Global API", 2000),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const email = (req.body?.email || "").toLowerCase().trim();
    return email ? `${ip}_${email}` : ip;
  },
  handler: createRateLimitHandler("Auth Login", 5),
});

const accountCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many account creation requests from this IP. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Account Creation", 5),
});

const aiGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "AI generation request limit reached. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("AI Generation", 10),
});

const scrapingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many content retrieval requests. Potential automated scraping blocked." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Anti-Scraping Data Access", 100),
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many password reset attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Password Reset", 3),
});

const emailVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many email verification requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Email Verification", 5),
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Public Content", 500),
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Admin Management", 100),
});

const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Guest Users", 30),
});

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 700,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler("Interaction Tracking", 700),
});

const containsMongoOperators = (obj) => {
  if (!obj || typeof obj !== "object") return false;
  return Object.keys(obj).some(
    (key) => key.startsWith("$") || key.includes(".") || containsMongoOperators(obj[key])
  );
};

const sanitizeAndLogNoSQL = (req, res, next) => {
  const hasSuspiciousPayload =
    containsMongoOperators(req.body) ||
    containsMongoOperators(req.query) ||
    containsMongoOperators(req.params);

  if (hasSuspiciousPayload) {
    logger.logSecurityEvent(
      req,
      "NOSQL_INJECTION_SUSPECTED",
      "Request contained MongoDB operators ($ or .) which were automatically sanitized."
    );
  }

  ["body", "params"].forEach((key) => {
    if (req[key]) {
      req[key] = mongoSanitize.sanitize(req[key]);
    }
  });
  if (req.query) {
    Object.assign(req.query, mongoSanitize.sanitize(Object.assign({}, req.query)));
  }
  next();
};

const securityMiddleware = [
  httpsEnforcer,
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
  compression(),
  hpp(),
  sanitizeAndLogNoSQL,
  morgan("combined"),
];

module.exports = {
  securityMiddleware,
  apiLimiter,
  loginLimiter,
  accountCreationLimiter,
  aiGenerationLimiter,
  scrapingLimiter,
  passwordResetLimiter,
  emailVerifyLimiter,
  publicLimiter,
  adminLimiter,
  guestLimiter,
  trackLimiter,
};
