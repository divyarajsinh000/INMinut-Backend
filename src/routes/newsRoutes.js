const express = require("express");
const {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
  getNewsAnalytics,
  getAnalyticsDashboard,
  trackNewsInteraction,
  reorderNews,
  togglePinNews,
  toggleActiveNews,
} = require("../controllers/newsController");
const { auth, optionalAuth, authorize } = require("../middlewares/auth");
const upload = require("../config/multer");
const { publicLimiter, scrapingLimiter, trackLimiter, adminLimiter } = require("../middlewares/security");
const { botProtection } = require("../middlewares/botProtection");

const router = express.Router();

router.post("/", auth, authorize("super-admin", "editor", "reporter"), upload.array('media'), createNews);
router.get("/", botProtection, scrapingLimiter, publicLimiter, optionalAuth, getNews);
router.get("/analytics/summary", auth, authorize("super-admin", "editor"), getNewsAnalytics);
router.get("/analytics/dashboard", auth, authorize("super-admin", "editor"), getAnalyticsDashboard);
router.patch("/reorder", auth, authorize("super-admin", "editor"), reorderNews);
router.patch("/:id/toggle-pin", auth, authorize("super-admin", "editor"), togglePinNews);
router.patch("/:id/toggle-active", auth, authorize("super-admin", "editor"), toggleActiveNews);
router.post("/:id/track", trackLimiter, trackNewsInteraction);
router.get("/:id", botProtection, scrapingLimiter, publicLimiter, optionalAuth, getNewsById);
router.put("/:id", auth, authorize("super-admin", "editor", "reporter"), upload.array('media'), updateNews);
router.delete("/:id", auth, authorize("super-admin"), deleteNews);

module.exports = router;
