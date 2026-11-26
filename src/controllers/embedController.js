const Embed = require("../models/Embed");
const Category = require("../models/Category");
const { prepareEmbedCode } = require("../utils/embedContent");
const { sanitizeString, isValidObjectId, escapeRegExp } = require("../utils/sanitizer");

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const parseCategories = async (value) => {
  if (value === undefined) return [];
  let ids = value;
  if (typeof ids === "string") {
    try { ids = JSON.parse(ids); } catch { ids = ids.split(",").map((id) => id.trim()); }
  }
  if (!Array.isArray(ids) || ids.some((id) => !isValidObjectId(id))) throw new Error("Invalid target categories");
  ids = [...new Set(ids.map((id) => id.toLowerCase()))];
  if (ids.length && await Category.countDocuments({ _id: { $in: ids } }) !== ids.length) throw new Error("One or more target categories no longer exist");
  return ids;
};
const validateShareUrl = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Invalid share URL");
  }

  const url = value.trim();

  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }

    if (parsed.username || parsed.password) {
      throw new Error();
    }

    return url;
  } catch {
    throw new Error("Share URL must be a valid HTTP or HTTPS URL");
  }
};
const dimension = (value, name, min, max) => {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") throw new Error(`${name} must be a number`);
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return n;
};

const validateEmbedFields = async (body, creating = false) => {
  const values = {};

  if (creating || body.embedCode !== undefined) {
    values.embedCode = prepareEmbedCode(body.embedCode);
  }

  if (creating || body.categories !== undefined) {
    values.categories = await parseCategories(body.categories);
  }

  if (creating || body.shareUrl !== undefined) {
    values.shareUrl = validateShareUrl(body.shareUrl);
  }

  if (creating || body.height !== undefined) values.height = dimension(body.height, "Height", 80, 4000);
  if (creating || body.width !== undefined) values.width = body.width == null || body.width === "" ? null : dimension(body.width, "Width", 50, 2000);
  if (creating || body.autoSize !== undefined) {
    if (body.autoSize !== undefined && ![true, false, "true", "false"].includes(body.autoSize)) throw new Error("Invalid autoSize value");
    values.autoSize = parseBoolean(body.autoSize);
  }
  for (const [name, choices, fallback] of [
    ["widthMode", ["fill", "contain", "original"], "contain"],
    ["alignment", ["left", "center", "right"], "center"],
  ]) {
    if (body[name] !== undefined) {
      if (!choices.includes(body[name])) throw new Error(`Invalid ${name}`);
      values[name] = body[name];
    } else if (creating) values[name] = fallback;
  }
  for (const name of ["paddingHorizontal", "paddingVertical"]) {
    if (body[name] !== undefined) values[name] = dimension(body[name], name, 0, 50);
    else if (creating) values[name] = 8;
  }
  return values;
};

const createEmbed = async (req, res) => {
  try {
    const { title, embedCode, height, positionAfterNews, isEnabled, categories } = req.body;

    if (!title || !embedCode || height === undefined || positionAfterNews === undefined) {
      return res.status(400).json({
        success: false,
        message: "Title, embedCode, height, and positionAfterNews are required",
      });
    }

    const numericHeight = Number(height);
    const numericPosition = Number(positionAfterNews);

    if (Number.isNaN(numericHeight) || Number.isNaN(numericPosition)) {
      return res.status(400).json({
        success: false,
        message: "Height and positionAfterNews must be valid numbers",
      });
    }

    let validated;
    try { validated = await validateEmbedFields(req.body, true); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }

    const embed = await Embed.create({
      title: sanitizeString(title),
      embedCode: validated.embedCode,
       shareUrl: validated.shareUrl,
      height: validated.height,
      width: validated.width,
      autoSize: validated.autoSize,
      widthMode: validated.widthMode,
      paddingHorizontal: validated.paddingHorizontal,
      paddingVertical: validated.paddingVertical,
      alignment: validated.alignment,
      positionAfterNews: numericPosition,
      isEnabled: isEnabled === undefined ? true : parseBoolean(isEnabled),
      categories: validated.categories,
    });

    const populatedEmbed = await Embed.findById(embed._id).populate({ path: "categories", transform: (doc, id) => doc || { _id: id, name: "Deleted category" } });

    return res.status(201).json({
      success: true,
      message: "Embed created successfully",
      data: populatedEmbed,
    });
  } catch (error) {
    console.error("Create embed error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const getEmbeds = async (req, res) => {
  try {
    const { enabledOnly, search } = req.query;
    const query = {};

    if (enabledOnly === "true") {
      query.isEnabled = true;
    }

    const category = req.query.category ?? req.query.categoryId;
    if (category !== undefined) {
      if (category === "all") {
        query.categories = { $size: 0 };
      } else if (isValidObjectId(category)) {
        query.$or = [{ categories: { $size: 0 } }, { categories: category }];
      } else {
        return res.status(400).json({ success: false, message: "Invalid category filter" });
      }
    }

    if (search && String(search).trim()) {
      const keyword = escapeRegExp(String(search).trim());
      query.title = { $regex: keyword, $options: "i" };
    }

    const sortOptions = req.query.sort === "recent" 
      ? { createdAt: -1 } 
      : { positionAfterNews: 1, createdAt: -1 };

    const embeds = await Embed.find(query).populate({ path: "categories", transform: (doc, id) => doc || { _id: id, name: "Deleted category" } }).sort(sortOptions);

    return res.json({ success: true, data: embeds });
  } catch (error) {
    console.error("Get embeds error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const getEmbedById = async (req, res) => {
  try {
    const embed = await Embed.findById(req.params.id).populate({ path: "categories", transform: (doc, id) => doc || { _id: id, name: "Deleted category" } });
    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    return res.json({ success: true, data: embed });
  } catch (error) {
    console.error("Get embed by id error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const updateEmbed = async (req, res) => {
  try {
    const embed = await Embed.findById(req.params.id);
    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    const { title, embedCode, height, positionAfterNews, isEnabled, categories } = req.body;

    let validated;
    try { validated = await validateEmbedFields(req.body); } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
    if (title !== undefined) embed.title = sanitizeString(title);
    if (embedCode !== undefined) embed.embedCode = validated.embedCode;
    if (height !== undefined) embed.height = validated.height;
    if (req.body.width !== undefined) embed.width = validated.width;
    if (req.body.autoSize !== undefined) embed.autoSize = validated.autoSize;
    for (const field of ["widthMode", "paddingHorizontal", "paddingVertical", "alignment"]) {
      if (validated[field] !== undefined) embed[field] = validated[field];
    }
    if (positionAfterNews !== undefined) embed.positionAfterNews = Number(positionAfterNews);
    if (isEnabled !== undefined) embed.isEnabled = parseBoolean(isEnabled);
    if (categories !== undefined) embed.categories = validated.categories;
if (req.body.shareUrl !== undefined) {
  embed.shareUrl = validated.shareUrl;
}
    await embed.save();
    await embed.populate({ path: "categories", transform: (doc, id) => doc || { _id: id, name: "Deleted category" } });

    return res.json({
      success: true,
      message: "Embed updated successfully",
      data: embed,
    });
  } catch (error) {
    console.error("Update embed error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const deleteEmbed = async (req, res) => {
  try {
    const embed = await Embed.findByIdAndDelete(req.params.id);
    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    return res.json({ success: true, message: "Embed deleted successfully" });
  } catch (error) {
    console.error("Delete embed error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const toggleEmbed = async (req, res) => {
  try {
    const embed = await Embed.findById(req.params.id);
    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    embed.isEnabled = !embed.isEnabled;
    await embed.save();
    await embed.populate({ path: "categories", transform: (doc, id) => doc || { _id: id, name: "Deleted category" } });

    return res.json({
      success: true,
      message: `Embed ${embed.isEnabled ? "enabled" : "disabled"}`,
      data: embed,
    });
  } catch (error) {
    console.error("Toggle embed error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const trackEmbedInteraction = async (req, res) => {
  try {
    const { action } = req.body; // 'view' | 'click'
    if (!["view", "click"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const updateField = action === "view" ? "viewCount" : "clickCount";
    const embed = await Embed.findByIdAndUpdate(
      req.params.id,
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    return res.json({
      success: true,
      message: `Embed ${action} tracked successfully`,
      data: {
        embedId: embed._id,
        action,
        viewCount: embed.viewCount || 0,
        clickCount: embed.clickCount || 0,
      },
    });
  } catch (error) {
    console.error("Track embed interaction error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

module.exports = {
  createEmbed,
  getEmbeds,
  getEmbedById,
  updateEmbed,
  deleteEmbed,
  toggleEmbed,
  trackEmbedInteraction,
};
