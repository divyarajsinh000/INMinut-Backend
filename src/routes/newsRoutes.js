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
const { publicLimiter, trackLimiter } = require("../middlewares/security");
const { validateObjectIds } = require("../middlewares/validateInput");

const router = express.Router();

router.post("/", auth, authorize("super-admin", "editor", "reporter"), upload.array("media"), createNews);
router.get("/", publicLimiter, optionalAuth, getNews);
router.get("/analytics/summary", auth, authorize("super-admin", "editor"), getNewsAnalytics);
router.get("/analytics/dashboard", auth, authorize("super-admin", "editor"), getAnalyticsDashboard);
router.patch("/reorder", auth, authorize("super-admin", "editor"), reorderNews);
router.patch("/:id/toggle-pin", auth, authorize("super-admin", "editor"), validateObjectIds("id"), togglePinNews);
router.patch("/:id/toggle-active", auth, authorize("super-admin", "editor"), validateObjectIds("id"), toggleActiveNews);
router.post("/:id/track", trackLimiter, validateObjectIds("id"), trackNewsInteraction);
router.get("/:id", publicLimiter, optionalAuth, validateObjectIds("id"), getNewsById);
router.put("/:id", auth, authorize("super-admin", "editor", "reporter"), validateObjectIds("id"), upload.array("media"), updateNews);
router.delete("/:id", auth, authorize("super-admin"), validateObjectIds("id"), deleteNews);

module.exports = router;
