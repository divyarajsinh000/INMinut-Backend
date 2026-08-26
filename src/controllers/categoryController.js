const Category = require("../models/Category");
const { sanitizeString, isValidObjectId } = require("../utils/sanitizer");

const createCategory = async (req, res) => {
  try {
    const { name, backgroundColor, textColor, isHighlighted } = req.body;

    const cleanName = sanitizeString(name);
    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existingCategory = await Category.findOne({ name: cleanName });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name: cleanName,
      backgroundColor: sanitizeString(backgroundColor) || "#000000",
      textColor: sanitizeString(textColor) || "#FFFFFF",
      isHighlighted: Boolean(isHighlighted),
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ sequence: 1, createdAt: -1 });
    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, backgroundColor, textColor, isHighlighted } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = sanitizeString(name);
    if (backgroundColor !== undefined) updates.backgroundColor = sanitizeString(backgroundColor);
    if (textColor !== undefined) updates.textColor = sanitizeString(textColor);
    if (typeof isHighlighted === "boolean") updates.isHighlighted = isHighlighted;

    const category = await Category.findByIdAndUpdate(
      id,
      updates,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const reorderCategories = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: "orderedIds must be an array" });
    }

    const validOrderedIds = orderedIds.filter((id) => isValidObjectId(id));

    const bulkOps = validOrderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sequence: index } },
      },
    }));

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    return res.json({ success: true, message: "Categories reordered successfully" });
  } catch (error) {
    console.error("Reorder categories error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
