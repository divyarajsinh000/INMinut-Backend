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

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BrekingApp MongoDB Backend API is running",
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/guest-users", guestUserRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/advertisements", advertisementRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});