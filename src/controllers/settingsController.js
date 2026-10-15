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
      if (req.files.appLogo?.[0]) settings.appLogo = req.files.appLogo[0].location || req.files.appLogo[0].key || req.files.appLogo[0].filename;
      if (req.files.appIcon?.[0]) settings.appIcon = req.files.appIcon[0].location || req.files.appIcon[0].key || req.files.appIcon[0].filename;
      if (req.files.defaultNewsImage?.[0]) settings.defaultNewsImage = req.files.defaultNewsImage[0].location || req.files.defaultNewsImage[0].key || req.files.defaultNewsImage[0].filename;
      if (req.files.defaultShareImage?.[0]) settings.defaultShareImage = req.files.defaultShareImage[0].location || req.files.defaultShareImage[0].key || req.files.defaultShareImage[0].filename;
    }

    await settings.save();
    return res.json({ success: true, message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

const updateAppVersionSettings = async (req, res) => {
  try {
    const isVersion = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
    const isUrl = value => !value || (typeof value === 'string' && /^https:\/\//i.test(value));
    const input = req.body?.appUpdates;
    if (!input || typeof input !== 'object') return res.status(400).json({ success: false, message: 'appUpdates is required' });
    for (const platform of ['android', 'ios']) {
      const entry = input[platform];
      if (!entry || typeof entry !== 'object' ||
          !['latestVersion', 'minimumVersion'].every(field => !entry[field] || isVersion(entry[field])) ||
          !isUrl(entry.storeUrl)) {
        return res.status(400).json({ success: false, message: `Invalid ${platform} version settings` });
      }
    }
    const settings = (await Setting.findOne()) || new Setting();
    settings.appUpdates = {
      android: input.android,
      ios: input.ios,
      updateMessage: String(input.updateMessage || 'A new version of INMinut is available.').slice(0, 500),
    };
    await settings.save();
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not update app version settings' });
  }
};

module.exports = {
  updateAppVersionSettings,
  getSettings,
  updateSettings,
};
