const Setting = require("../models/Setting");

const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    return res.json({ success: true, settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }
    
    if (req.files) {
      if (req.files.appLogo?.[0]) settings.appLogo = req.files.appLogo[0].location || req.files.appLogo[0].key || req.files.appLogo[0].filename;
      if (req.files.appIcon?.[0]) settings.appIcon = req.files.appIcon[0].location || req.files.appIcon[0].key || req.files.appIcon[0].filename;
      if (req.files.defaultNewsImage?.[0]) settings.defaultNewsImage = req.files.defaultNewsImage[0].location || req.files.defaultNewsImage[0].key || req.files.defaultNewsImage[0].filename;
      if (req.files.defaultShareImage?.[0]) settings.defaultShareImage = req.files.defaultShareImage[0].location || req.files.defaultShareImage[0].key || req.files.defaultShareImage[0].filename;
    }

    await settings.save();
    return res.json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
