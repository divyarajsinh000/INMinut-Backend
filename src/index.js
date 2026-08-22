const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const validateEnv = require("./config/envValidation");
const logger = require("./utils/logger");

// 1. Run startup validation on environment variables & secrets
validateEnv();

const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const newsRoutes = require("./routes/newsRoutes");
const guestUserRoutes = require("./routes/guestUserRoutes");
const locationRoutes = require("./routes/locationRoutes");
const advertisementRoutes = require("./routes/advertisementRoutes");
const embedRoutes = require("./routes/embedRoutes");
const settingRoutes = require("./routes/settingRoutes");
const aiRoutes = require("./routes/aiRoutes");
const { securityMiddleware, apiLimiter } = require("./middlewares/security");
const { botProtection, honeypotTrap } = require("./middlewares/botProtection");

const app = express();

// Trust upstream reverse proxy headers (Nginx / Cloudflare / AWS ALB)
app.set("trust proxy", 1);

// 2. Connect to MongoDB
connectDB().catch((err) => logger.error("Async DB connection error:", { message: err.message }));

app.disable("x-powered-by");

// 3. Mount security middleware (HTTPS enforcement, Helmet headers, Mongo sanitize, Morgan logger)
securityMiddleware.forEach((mw) => app.use(mw));
app.use(botProtection);

const allowedOrigins = [
  "https://admin.inminut.com",
  "https://inminut.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.logSecurityEvent(
      null,
      "CORS_BLOCKED_ORIGIN",
      `Blocked unauthorized origin: ${origin}`,
      { origin }
    );
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Honeypot bait routes to trap automated scanners
app.use(["/api/admin/setup-root", "/api/v1/debug", "/.env", "/wp-login.php", "/admin/config"], honeypotTrap);

// Global Rate Limiter
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "INMinut Backend API is running securely",
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/guest-users", guestUserRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/embeds", embedRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/ai", aiRoutes);

// Centralized error handling middleware with security logging
app.use((err, req, res, next) => {
  const status = err.status || 500;
  logger.logApiError(req, err, status);

  const responseMessage =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message || "Internal server error";

  res.status(status).json({
    success: false,
    message: responseMessage,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${process.env.NODE_ENV || "development"} mode)`);
});
