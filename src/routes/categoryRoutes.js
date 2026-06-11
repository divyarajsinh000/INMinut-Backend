const express = require("express");
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { auth, authorize } = require("../middlewares/auth");

const router = express.Router();

router.post("/", auth, authorize("super-admin"), createCategory);
router.get("/", getCategories);
router.put("/:id", auth, authorize("super-admin"), updateCategory);
router.delete("/:id", auth, authorize("super-admin"), deleteCategory);

module.exports = router;
