const Advertisement = require("../models/Advertisement");
const path = require("path");
const fs = require("fs");

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const parseArrayField = (value, fallback = []) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : fallback;
    } catch (_) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return fallback;
};

const normalizeUrl = (url) => {
  if (!url) return url;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const deleteUploadedFile = (fileUrl) => {
  if (!fileUrl) return;
  const filePath = path.join(__dirname, "../../", fileUrl);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const getImageUrlFromRequest = (req) => {
  if (!req.file) return null;
  return `/uploads/images/${req.file.filename}`;
};

const createAdvertisement = async (req, res) => {
  try {
    const { name, label, redirectUrl, positionAfterNews, isEnabled, cities } = req.body;
    const bannerImage = getImageUrlFromRequest(req);

    if (!name || !redirectUrl || !bannerImage) {
      return res.status(400).json({
        success: false,
        message: "Name, redirect URL and banner image are required",
      });
    }

    const advertisement = await Advertisement.create({
      name,
      label: label || "Advertisement",
      bannerImage,
      redirectUrl: normalizeUrl(redirectUrl),
      cities: parseArrayField(cities),
      positionAfterNews: (positionAfterNews !== undefined && positionAfterNews !== "") ? Number(positionAfterNews) : 4,
      isEnabled: isEnabled === undefined ? true : parseBoolean(isEnabled),
    });

    const populatedAdvertisement = await Advertisement.findById(advertisement._id).populate("cities");

    return res.status(201).json({
      success: true,
      message: "Advertisement created successfully",
      data: populatedAdvertisement,
    });
  } catch (error) {
    console.error("Create advertisement error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAdvertisements = async (req, res) => {
  try {
    const { enabledOnly, city, cityId, cityIds } = req.query;
    const query = {};

    if (enabledOnly === "true") {
      query.isEnabled = true;
    }

    const selectedCities = parseArrayField(cityIds || cityId || city);

    // When city is provided by the app, return city-specific ads plus global ads.
    // Global ads are ads where cities is empty.
    if (selectedCities.length > 0) {
      query.$or = [
        { cities: { $in: selectedCities } },
        { cities: { $size: 0 } },
      ];
    }

    const advertisements = await Advertisement.find(query)
      .populate("cities")
      .sort({
        positionAfterNews: 1,
        createdAt: -1,
      });

    return res.json({ success: true, data: advertisements });
  } catch (error) {
    console.error("Get advertisements error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id).populate("cities");
    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" });
    }

    return res.json({ success: true, data: advertisement });
  } catch (error) {
    console.error("Get advertisement by id error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" });
    }

    const { name, label, redirectUrl, positionAfterNews, isEnabled, cities } = req.body;
    const newBannerImage = getImageUrlFromRequest(req);

    if (newBannerImage) {
      deleteUploadedFile(advertisement.bannerImage);
      advertisement.bannerImage = newBannerImage;
    }

    if (name !== undefined) advertisement.name = name;
    if (label !== undefined) advertisement.label = label;
    if (redirectUrl !== undefined) advertisement.redirectUrl = normalizeUrl(redirectUrl);
    if (cities !== undefined) advertisement.cities = parseArrayField(cities);
    if (positionAfterNews !== undefined) {
      advertisement.positionAfterNews = positionAfterNews !== "" ? Number(positionAfterNews) : 4;
    }
    if (isEnabled !== undefined) advertisement.isEnabled = parseBoolean(isEnabled);

    await advertisement.save();
    await advertisement.populate("cities");

    return res.json({
      success: true,
      message: "Advertisement updated successfully",
      data: advertisement,
    });
  } catch (error) {
    console.error("Update advertisement error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findByIdAndDelete(req.params.id);
    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" });
    }

    deleteUploadedFile(advertisement.bannerImage);

    return res.json({ success: true, message: "Advertisement deleted successfully" });
  } catch (error) {
    console.error("Delete advertisement error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const toggleAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" });
    }

    advertisement.isEnabled = !advertisement.isEnabled;
    await advertisement.save();
    await advertisement.populate("cities");

    return res.json({
      success: true,
      message: `Advertisement ${advertisement.isEnabled ? "enabled" : "disabled"}`,
      data: advertisement,
    });
  } catch (error) {
    console.error("Toggle advertisement error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const trackAdInteraction = async (req, res) => {
  try {
    const { action } = req.body; // 'view' | 'click'
    if (!["view", "click"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    const updateField = action === "view" ? "viewCount" : "clickCount";
    const advertisement = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" });
    }

    return res.json({
      success: true,
      message: `Advertisement ${action} tracked successfully`,
      data: {
        advertisementId: advertisement._id,
        action,
        viewCount: advertisement.viewCount || 0,
        clickCount: advertisement.clickCount || 0,
      },
    });
  } catch (error) {
    console.error("Track advertisement interaction error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createAdvertisement,
  getAdvertisements,
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisement,
  trackAdInteraction,
};
