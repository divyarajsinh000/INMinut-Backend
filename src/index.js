const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const newsRoutes = require("./routes/newsRoutes");
const guestUserRoutes = require("./routes/guestUserRoutes");
const locationRoutes = require("./routes/locationRoutes");
const advertisementRoutes = require("./routes/advertisementRoutes");
const embedRoutes = require("./routes/embedRoutes");
const settingRoutes = require("./routes/settingRoutes");
const { securityMiddleware, apiLimiter } = require("./middlewares/security");

const app = express();
connectDB();

app.disable("x-powered-by");

securityMiddleware.forEach((mw) => app.use(mw));

const allowedOrigins = [
  "https://admin.inminut.com",
  "https://inminut.com",
];
console.log("Bucket:", process.env.AWS_S3_BUCKET);
console.log("Region:", process.env.AWS_REGION);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.set("trust proxy", 1);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "INMinut Backend API is running",
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
