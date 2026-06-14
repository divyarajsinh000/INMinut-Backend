const Embed = require("../models/Embed");

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const createEmbed = async (req, res) => {
  try {
    const { title, embedCode, height, positionAfterNews, isEnabled } = req.body;

    if (!title || !embedCode || height === undefined || positionAfterNews === undefined) {
      return res.status(400).json({
        success: false,
        message: "Title, embedCode, height, and positionAfterNews are required",
      });
    }

    const embed = await Embed.create({
      title,
      embedCode,
      height: Number(height),
      positionAfterNews: Number(positionAfterNews),
      isEnabled: isEnabled === undefined ? true : parseBoolean(isEnabled),
    });

    return res.status(201).json({
      success: true,
      message: "Embed created successfully",
      data: embed,
    });
  } catch (error) {
    console.error("Create embed error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getEmbeds = async (req, res) => {
  try {
    const { enabledOnly } = req.query;
    const query = {};

    if (enabledOnly === "true") {
      query.isEnabled = true;
    }

    const embeds = await Embed.find(query).sort({
      positionAfterNews: 1,
      createdAt: -1,
    });

    return res.json({ success: true, data: embeds });
  } catch (error) {
    console.error("Get embeds error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getEmbedById = async (req, res) => {
  try {
    const embed = await Embed.findById(req.params.id);
    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    return res.json({ success: true, data: embed });
  } catch (error) {
    console.error("Get embed by id error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateEmbed = async (req, res) => {
  try {
    const embed = await Embed.findById(req.params.id);
    if (!embed) {
      return res.status(404).json({ success: false, message: "Embed not found" });
    }

    const { title, embedCode, height, positionAfterNews, isEnabled } = req.body;

    if (title !== undefined) embed.title = title;
    if (embedCode !== undefined) embed.embedCode = embedCode;
    if (height !== undefined) embed.height = Number(height);
    if (positionAfterNews !== undefined) embed.positionAfterNews = Number(positionAfterNews);
    if (isEnabled !== undefined) embed.isEnabled = parseBoolean(isEnabled);

    await embed.save();

    return res.json({
      success: true,
      message: "Embed updated successfully",
      data: embed,
    });
  } catch (error) {
    console.error("Update embed error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
    return res.status(500).json({ success: false, message: "Internal server error" });
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

    return res.json({
      success: true,
      message: `Embed ${embed.isEnabled ? "enabled" : "disabled"}`,
      data: embed,
    });
  } catch (error) {
    console.error("Toggle embed error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
    return res.status(500).json({ success: false, message: "Internal server error" });
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
