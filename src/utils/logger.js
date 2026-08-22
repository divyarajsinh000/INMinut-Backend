const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.join(__dirname, "../../logs");

if (!fs.existsSync(LOGS_DIR)) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create logs directory:", err.message);
  }
}

const writeToFile = (filename, logEntry) => {
  try {
    const filePath = path.join(LOGS_DIR, filename);
    const line = JSON.stringify(logEntry) + "\n";
    fs.appendFileSync(filePath, line, "utf-8");
    
    if (filename !== "combined.log") {
      const combinedPath = path.join(LOGS_DIR, "combined.log");
      fs.appendFileSync(combinedPath, line, "utf-8");
    }
  } catch (err) {
    console.error(`Failed to write log to ${filename}:`, err.message);
  }
};

const getClientIp = (req) => {
  if (!req) return "N/A";
  return (
    req.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "N/A"
  );
};

const getClientUserAgent = (req) => {
  if (!req) return "N/A";
  return req.headers?.["user-agent"] || "N/A";
};

const logger = {
  info: (message, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      message,
      ...meta,
    };
    console.log(`[INFO] ${entry.timestamp} - ${message}`, Object.keys(meta).length ? meta : "");
    writeToFile("combined.log", entry);
  },

  error: (message, meta = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message,
      ...meta,
    };
    console.error(`[ERROR] ${entry.timestamp} - ${message}`, meta);
    writeToFile("error.log", entry);
  },

  logAuthSuccess: (req, details = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      eventType: "AUTH_SUCCESS",
      ip: getClientIp(req),
      userAgent: getClientUserAgent(req),
      email: details.email || req.body?.email || "N/A",
      userId: details.userId || details._id || "N/A",
      role: details.role || "N/A",
      action: details.action || "LOGIN",
      path: req?.originalUrl || req?.url || "N/A",
      method: req?.method || "N/A",
    };
    console.log(`[AUTH SUCCESS] ${entry.timestamp} | User: ${entry.email} | IP: ${entry.ip} | Action: ${entry.action}`);
    writeToFile("auth.log", entry);
  },

  logAuthFailure: (req, reason, details = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "WARN",
      eventType: "AUTH_FAILURE",
      ip: getClientIp(req),
      userAgent: getClientUserAgent(req),
      email: details.email || req.body?.email || "N/A",
      reason: reason || "Unknown authentication failure",
      path: req?.originalUrl || req?.url || "N/A",
      method: req?.method || "N/A",
    };
    console.warn(`[AUTH FAILURE] ${entry.timestamp} | Target Email: ${entry.email} | IP: ${entry.ip} | Reason: ${entry.reason}`);
    writeToFile("auth.log", entry);
  },

  logSecurityEvent: (req, eventType, description, extra = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: "SECURITY_ALERT",
      eventType,
      description,
      ip: getClientIp(req),
      userAgent: getClientUserAgent(req),
      path: req?.originalUrl || req?.url || "N/A",
      method: req?.method || "N/A",
      userId: req?.admin?._id || extra.userId || "N/A",
      ...extra,
    };
    console.warn(`[SECURITY ALERT] [${eventType}] ${entry.timestamp} | ${description} | IP: ${entry.ip} | Path: ${entry.path}`);
    writeToFile("security.log", entry);
  },

  logApiError: (req, err, status = 500) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level: status >= 500 ? "ERROR" : "WARN",
      eventType: "API_ERROR",
      status,
      message: err?.message || String(err),
      stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
      ip: getClientIp(req),
      userAgent: getClientUserAgent(req),
      path: req?.originalUrl || req?.url || "N/A",
      method: req?.method || "N/A",
      userId: req?.admin?._id || "N/A",
    };
    console.error(`[API ERROR ${status}] ${entry.timestamp} | ${entry.method} ${entry.path} | Error: ${entry.message}`);
    writeToFile("error.log", entry);
  },
};

module.exports = logger;
