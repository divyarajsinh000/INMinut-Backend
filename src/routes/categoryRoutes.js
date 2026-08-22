const express = require("express");
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require("../controllers/categoryController");
const { auth, authorize } = require("../middlewares/auth");
const { scrapingLimiter } = require("../middlewares/security");
const { botProtection } = require("../middlewares/botProtection");

const router = express.Router();

router.post("/", auth, authorize("super-admin"), createCategory);
router.get("/", botProtection, scrapingLimiter, getCategories);
router.put("/reorder", auth, authorize("super-admin"), reorderCategories);
router.put("/:id", auth, authorize("super-admin"), updateCategory);
router.delete("/:id", auth, authorize("super-admin"), deleteCategory);

module.exports = router;
