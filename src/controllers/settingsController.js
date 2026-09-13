const Setting = require("../models/Setting");
const path = require("path");

const getUploadedFileUrl = (file) => {
  if (!file) return "";
  if (file.location) return file.location;
  if (file.url) return file.url;
  if (file.filename) return `/uploads/images/${file.filename}`;
  if (file.path) {
    const normalizedPath = String(file.path).replace(/\\/g, "/");
    const uploadsIndex = normalizedPath.lastIndexOf("/uploads/");
    if (uploadsIndex >= 0) return normalizedPath.slice(uploadsIndex);
    return `/uploads/images/${path.basename(normalizedPath)}`;
  }
  if (file.key) return `/uploads/${file.key.replace(/^\/+/, "")}`;
  return "";
};

const normalizeSettingMediaUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return "";
  const trimmed = urlStr.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }
  if (trimmed.startsWith("uploads/")) {
    return `/${trimmed}`;
  }
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `/uploads/images/${cleanPath}`;
};

const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    const settingsObj = settings.toObject();
    if (settingsObj.appLogo) settingsObj.appLogo = normalizeSettingMediaUrl(settingsObj.appLogo);
    if (settingsObj.appIcon) settingsObj.appIcon = normalizeSettingMediaUrl(settingsObj.appIcon);
    if (settingsObj.defaultNewsImage) settingsObj.defaultNewsImage = normalizeSettingMediaUrl(settingsObj.defaultNewsImage);
    if (settingsObj.defaultShareImage) settingsObj.defaultShareImage = normalizeSettingMediaUrl(settingsObj.defaultShareImage);

    return res.json({ success: true, settings: settingsObj });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    
    if (req.files) {
      if (req.files.appLogo?.[0]) settings.appLogo = getUploadedFileUrl(req.files.appLogo[0]);
      if (req.files.appIcon?.[0]) settings.appIcon = getUploadedFileUrl(req.files.appIcon[0]);
      if (req.files.defaultNewsImage?.[0]) settings.defaultNewsImage = getUploadedFileUrl(req.files.defaultNewsImage[0]);
      if (req.files.defaultShareImage?.[0]) settings.defaultShareImage = getUploadedFileUrl(req.files.defaultShareImage[0]);
    }

    await settings.save();

    const settingsObj = settings.toObject();
    if (settingsObj.appLogo) settingsObj.appLogo = normalizeSettingMediaUrl(settingsObj.appLogo);
    if (settingsObj.appIcon) settingsObj.appIcon = normalizeSettingMediaUrl(settingsObj.appIcon);
    if (settingsObj.defaultNewsImage) settingsObj.defaultNewsImage = normalizeSettingMediaUrl(settingsObj.defaultNewsImage);
    if (settingsObj.defaultShareImage) settingsObj.defaultShareImage = normalizeSettingMediaUrl(settingsObj.defaultShareImage);

    return res.json({ success: true, message: "Settings updated successfully", settings: settingsObj });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};

