const express = require("express");
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require("../controllers/categoryController");
const { auth, authorize } = require("../middlewares/auth");
const { validateObjectIds } = require("../middlewares/validateInput");

const router = express.Router();

router.post("/", auth, authorize("super-admin"), createCategory);
router.get("/", getCategories);
router.put("/reorder", auth, authorize("super-admin"), reorderCategories);
router.put("/:id", auth, authorize("super-admin"), validateObjectIds("id"), updateCategory);
router.delete("/:id", auth, authorize("super-admin"), validateObjectIds("id"), deleteCategory);

module.exports = router;
