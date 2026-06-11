const News = require("../models/News");
const NewsInteraction = require("../models/NewsInteraction");
const GuestUser = require("../models/GuestUser");
const path = require("path");
const fs = require("fs");
const { sendNewsNotificationToGuests } = require("../services/notificationService");

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
};

const parseNumberField = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const canManageAllNews = (admin) => admin && ["super-admin", "editor"].includes(admin.role);

const canEditNews = (admin, news) => {
  if (!admin) return false;
  if (canManageAllNews(admin)) return true;
  return admin.role === "reporter" && news.createdBy?.toString() === admin._id.toString();
};

const parseArrayField = (value, fallback = []) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : fallback;
    } catch (_) {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return fallback;
};

const SORT_KEY_TO_FIELD = {
  views: "viewCount",
  viewCount: "viewCount",
  saves: "saveCount",
  saveCount: "saveCount",
  shares: "shareCount",
  shareCount: "shareCount",
  publishedDate: "publishedDate",
  createdAt: "createdAt",
};

const METRIC_FIELDS = ["viewCount", "saveCount", "shareCount"];

const getSortField = (sortBy, fallback = "createdAt") => {
  return SORT_KEY_TO_FIELD[sortBy] || fallback;
};

const buildNewsQuery = ({ category, search, cityIds, city, includeInactive, admin } = {}) => {
  const query = {};

  if (!includeInactive) {
    // Public app/API should show active news and legacy news where isActive does not exist yet.
    query.isActive = { $ne: false };
  }

  if (includeInactive && admin?.role === "reporter") {
    query.createdBy = admin._id;
  }
  const andConditions = [];

  if (category) {
    query.category = category;
  }

  if (search && String(search).trim()) {
    const keyword = String(search).trim();
    andConditions.push({
      $or: [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { content: { $regex: keyword, $options: "i" } },
        { hashtags: { $regex: keyword, $options: "i" } },
        { "reporter.name": { $regex: keyword, $options: "i" } },
      ],
    });
  }

  const selectedCities = parseArrayField(cityIds || city);
  if (selectedCities.length > 0) {
    andConditions.push({
      $or: [{ cities: { $in: selectedCities } }, { cities: { $size: 0 } }],
    });
  }

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  return query;
};

const createNews = async (req, res) => {
  try {
    const {
      title,
      titleColor,
      titleFontSize,
      description,
      descriptionFontSize,
      content,
      category,
      reporter,
      hashtags,
      isBreaking,
      breakingText,
      isActive,
      isPinned,
      publishedDate,
      cities,
    } = req.body;

    if (!title || !description || !content || !category || !reporter) {
      return res.status(400).json({
        success: false,
        message: "All required fields are missing",
      });
    }


    // Parse reporter from JSON string if needed
    let parsedReporter = reporter;
    if (typeof reporter === 'string') {
      try {
        parsedReporter = JSON.parse(reporter);
      } catch (e) {
        // If it's not JSON, keep as is
      }
    }

    // Process uploaded files
    const media = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        let fileType;
        if (file.mimetype.startsWith('image/')) {
          fileType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
          fileType = 'video';
        } else if (file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        if (fileType) {
          media.push({
            url: `/uploads/${fileType}s/${file.filename}`,
            type: fileType,
            originalName: file.originalname,
          });
        }
      });
    }

    const news = await News.create({
      title,
      titleColor: titleColor || "#111827",
      titleFontSize: parseNumberField(titleFontSize, 22, 10, 60),
      description,
      descriptionFontSize: parseNumberField(descriptionFontSize, 16, 10, 40),
      content,
      media,
      category,
      cities: parseArrayField(cities),
      reporter: parsedReporter,
      hashtags: hashtags ? JSON.parse(hashtags) : [],
      isBreaking: parseBoolean(isBreaking),
      breakingText: breakingText || "Breaking News",
      isActive: isActive === undefined ? true : parseBoolean(isActive),
      isPinned: parseBoolean(isPinned),
      createdBy: req.admin?._id,
      sortOrder: 0,
      publishedDate,
    });

    const populatedNews = await News.findById(news._id).populate("category").populate("cities");

    let notificationResult = null;
    try {
      if (populatedNews.isActive === false) {
        notificationResult = { success: true, sent: 0, failed: 0, skipped: true, reason: "News is off/hidden" };
      } else {
        notificationResult = await sendNewsNotificationToGuests(populatedNews);
      }
    } catch (notificationError) {
      console.error("News notification error:", notificationError);
      notificationResult = {
        success: false,
        sent: 0,
        failed: 0,
        error: notificationError.message,
      };
    }

    return res.status(201).json({
      success: true,
      message: "News created successfully",
      data: populatedNews,
      notification: notificationResult,
    });
  } catch (error) {
    console.error("Create news error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getNews = async (req, res) => {
  try {
    const { category, search, cityIds, city, sortBy, onlyWithMetric, includeInactive } = req.query;
    const showInactive = parseBoolean(includeInactive) && Boolean(req.admin);
    const query = buildNewsQuery({ category, search, cityIds, city, includeInactive: showInactive, admin: req.admin });
    const sortField = getSortField(sortBy, "manual");

    if (parseBoolean(onlyWithMetric) && METRIC_FIELDS.includes(sortField)) {
      query[sortField] = { $gt: 0 };
    }

    const sortOptions =
      sortField === "viewCount" || sortField === "saveCount" || sortField === "shareCount"
        ? { [sortField]: -1, publishedDate: -1, createdAt: -1 }
        : { isPinned: -1, pinOrder: 1, sortOrder: 1, publishedDate: -1, createdAt: -1 };

    const news = await News.find(query)
      .populate("category")
      .populate("cities")
      .populate("createdBy", "name email role")
      .sort(sortOptions);

    return res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error("Get news error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findById(id).populate("category").populate("cities").populate("createdBy", "name email role");

    if (!news || (!req.admin && news.isActive === false)) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    return res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error("Get news by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      titleColor,
      titleFontSize,
      description,
      descriptionFontSize,
      content,
      category,
      reporter,
      hashtags,
      isBreaking,
      breakingText,
      isActive,
      isPinned,
      publishedDate,
      cities,
      mediaToKeep,
    } = req.body;

    // Find existing news
    const existingNews = await News.findById(id);
    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    if (!canEditNews(req.admin, existingNews)) {
      return res.status(403).json({
        success: false,
        message: "You can edit only news created by you",
      });
    }

    // Parse reporter from JSON string if needed
    let parsedReporter = reporter;
    if (typeof reporter === 'string') {
      try {
        parsedReporter = JSON.parse(reporter);
      } catch (e) {
        // If it's not JSON, keep as is
      }
    }

    // Parse mediaToKeep from JSON string if needed
    let mediaToKeepArray = mediaToKeep;
    if (typeof mediaToKeep === 'string') {
      try {
        mediaToKeepArray = JSON.parse(mediaToKeep);
      } catch (e) {
        mediaToKeepArray = [];
      }
    }

    // Start with existing media that we want to keep
    let updatedMedia = existingNews.media.filter(m => 
      mediaToKeepArray && mediaToKeepArray.includes(m._id.toString())
    );

    // Delete the files that we're no longer keeping
    const mediaToDelete = existingNews.media.filter(m => 
      !mediaToKeepArray || !mediaToKeepArray.includes(m._id.toString())
    );
    mediaToDelete.forEach(mediaItem => {
      const filePath = path.join(__dirname, '../../', mediaItem.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // Add new uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        let fileType;
        if (file.mimetype.startsWith('image/')) {
          fileType = 'image';
        } else if (file.mimetype.startsWith('video/')) {
          fileType = 'video';
        } else if (file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        if (fileType) {
          updatedMedia.push({
            url: `/uploads/${fileType}s/${file.filename}`,
            type: fileType,
            originalName: file.originalname,
          });
        }
      });
    }

    const news = await News.findByIdAndUpdate(
      id,
      {
        title,
        titleColor: titleColor || existingNews.titleColor || "#111827",
        titleFontSize: parseNumberField(titleFontSize, existingNews.titleFontSize || 22, 10, 60),
        description,
        descriptionFontSize: parseNumberField(descriptionFontSize, existingNews.descriptionFontSize || 16, 10, 40),
        content,
        media: updatedMedia,
        category,
        cities: parseArrayField(cities, existingNews.cities),
        reporter: parsedReporter,
        hashtags: hashtags ? JSON.parse(hashtags) : existingNews.hashtags,
        isBreaking: parseBoolean(isBreaking),
        breakingText: breakingText || existingNews.breakingText || "Breaking News",
        isActive: isActive === undefined ? existingNews.isActive : parseBoolean(isActive),
        isPinned: isPinned === undefined ? existingNews.isPinned : parseBoolean(isPinned),
        publishedDate,
      },
      { new: true }
    ).populate("category").populate("cities").populate("createdBy", "name email role");

    return res.json({
      success: true,
      message: "News updated successfully",
      data: news,
    });
  } catch (error) {
    console.error("Update news error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findByIdAndDelete(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    // Delete all media files from storage
    news.media.forEach(mediaItem => {
      const filePath = path.join(__dirname, '../../', mediaItem.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    return res.json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (error) {
    console.error("Delete news error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



const reorderNews = async (req, res) => {
  try {
    if (!canManageAllNews(req.admin)) {
      return res.status(403).json({ success: false, message: "Only admin/editor can reorder news" });
    }
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "orderedIds must be a non-empty array",
      });
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        News.findByIdAndUpdate(id, {
          sortOrder: index + 1,
          pinOrder: index + 1,
        })
      )
    );

    const news = await News.find({ _id: { $in: orderedIds } })
      .populate("category")
      .populate("cities")
      .sort({ isPinned: -1, pinOrder: 1, sortOrder: 1, publishedDate: -1, createdAt: -1 });

    return res.json({
      success: true,
      message: "News order updated successfully",
      data: news,
    });
  } catch (error) {
    console.error("Reorder news error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const togglePinNews = async (req, res) => {
  try {
    if (!canManageAllNews(req.admin)) {
      return res.status(403).json({ success: false, message: "Only admin/editor can pin news" });
    }
    const { id } = req.params;
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    news.isPinned = !news.isPinned;
    if (news.isPinned && !news.pinOrder) {
      const pinnedCount = await News.countDocuments({ isPinned: true });
      news.pinOrder = pinnedCount + 1;
    }

    await news.save();
    const populatedNews = await News.findById(news._id).populate("category").populate("cities");

    return res.json({
      success: true,
      message: `News ${news.isPinned ? "pinned" : "unpinned"} successfully`,
      data: populatedNews,
    });
  } catch (error) {
    console.error("Toggle pin news error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const getNewsAnalytics = async (req, res) => {
  try {
    const {
      sortBy = "shareCount",
      limit,
      category,
      search,
      cityIds,
      city,
      onlyWithMetric = "false",
    } = req.query;

    const sortField = getSortField(sortBy, "shareCount");
    const queryObject = buildNewsQuery({ category, search, cityIds, city, includeInactive: true, admin: req.admin });

    // Important for admin filters:
    // Most viewed/saved/shared should not show every news item.
    // It should only show news where the selected metric count is greater than zero.
    if (parseBoolean(onlyWithMetric) && METRIC_FIELDS.includes(sortField)) {
      queryObject[sortField] = { $gt: 0 };
    }

    const query = News.find(queryObject)
      .populate("category")
      .populate("cities")
      .sort({ [sortField]: -1, publishedDate: -1, createdAt: -1 });

    if (limit && Number(limit) > 0) {
      query.limit(Number(limit));
    }

    const news = await query;
    const totals = await News.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$viewCount" },
          totalSaves: { $sum: "$saveCount" },
          totalShares: { $sum: "$shareCount" },
          totalNews: { $sum: 1 },
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        totals: totals[0] || { totalViews: 0, totalSaves: 0, totalShares: 0, totalNews: 0 },
        news,
      },
    });
  } catch (error) {
    console.error("Get news analytics error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const getTopList = (items, limit) => items.slice(0, limit).map((item, index) => ({ rank: index + 1, ...item }));

const getAnalyticsDashboard = async (req, res) => {
  try {
    const limit = Math.max(Number(req.query.limit || 10), 1);

    const totalsAgg = await News.aggregate([
      {
        $group: {
          _id: null,
          totalNews: { $sum: 1 },
          totalViews: { $sum: "$viewCount" },
          totalSaves: { $sum: "$saveCount" },
          totalShares: { $sum: "$shareCount" },
          pinnedNews: { $sum: { $cond: ["$isPinned", 1, 0] } },
          breakingNews: { $sum: { $cond: ["$isBreaking", 1, 0] } },
        },
      },
    ]);

    const guestTotalsAgg = await GuestUser.aggregate([
      {
        $group: {
          _id: null,
          totalGuestUsers: { $sum: 1 },
          notificationsEnabledUsers: { $sum: { $cond: ["$notificationsEnabled", 1, 0] } },
          androidUsers: { $sum: { $cond: [{ $eq: ["$platform", "android"] }, 1, 0] } },
          iosUsers: { $sum: { $cond: [{ $eq: ["$platform", "ios"] }, 1, 0] } },
          webUsers: { $sum: { $cond: [{ $eq: ["$platform", "web"] }, 1, 0] } },
        },
      },
    ]);

    const topNewsByViews = await News.find({})
      .populate("category")
      .populate("cities")
      .sort({ viewCount: -1, publishedDate: -1 })
      .limit(limit)
      .select("title category cities viewCount saveCount shareCount publishedDate isPinned isBreaking");

    const topNewsBySaves = await News.find({})
      .populate("category")
      .populate("cities")
      .sort({ saveCount: -1, publishedDate: -1 })
      .limit(limit)
      .select("title category cities viewCount saveCount shareCount publishedDate isPinned isBreaking");

    const topNewsByShares = await News.find({})
      .populate("category")
      .populate("cities")
      .sort({ shareCount: -1, publishedDate: -1 })
      .limit(limit)
      .select("title category cities viewCount saveCount shareCount publishedDate isPinned isBreaking");

    const topCategories = await News.aggregate([
      { $lookup: { from: "categories", localField: "category", foreignField: "_id", as: "category" } },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category._id",
          name: { $first: { $ifNull: ["$category.name", "Uncategorized"] } },
          backgroundColor: { $first: "$category.backgroundColor" },
          textColor: { $first: "$category.textColor" },
          newsCount: { $sum: 1 },
          views: { $sum: "$viewCount" },
          saves: { $sum: "$saveCount" },
          shares: { $sum: "$shareCount" },
        },
      },
      { $sort: { views: -1, shares: -1, newsCount: -1 } },
      { $limit: limit },
    ]);

    const topHashtags = await News.aggregate([
      { $unwind: "$hashtags" },
      {
        $group: {
          _id: { $toLower: "$hashtags" },
          hashtag: { $first: "$hashtags" },
          newsCount: { $sum: 1 },
          views: { $sum: "$viewCount" },
          saves: { $sum: "$saveCount" },
          shares: { $sum: "$shareCount" },
        },
      },
      { $sort: { views: -1, shares: -1, newsCount: -1 } },
      { $limit: limit },
    ]);

    const topNewsCities = await News.aggregate([
      { $unwind: { path: "$cities", preserveNullAndEmptyArrays: false } },
      { $lookup: { from: "cities", localField: "cities", foreignField: "_id", as: "city" } },
      { $unwind: "$city" },
      {
        $group: {
          _id: "$city._id",
          name: { $first: "$city.name" },
          newsCount: { $sum: 1 },
          views: { $sum: "$viewCount" },
          saves: { $sum: "$saveCount" },
          shares: { $sum: "$shareCount" },
        },
      },
      { $sort: { views: -1, shares: -1, newsCount: -1 } },
      { $limit: limit },
    ]);

    const topUserCities = await GuestUser.aggregate([
      { $unwind: { path: "$cityPreferences", preserveNullAndEmptyArrays: false } },
      { $lookup: { from: "cities", localField: "cityPreferences", foreignField: "_id", as: "city" } },
      { $unwind: "$city" },
      {
        $group: {
          _id: "$city._id",
          name: { $first: "$city.name" },
          users: { $sum: 1 },
        },
      },
      { $sort: { users: -1, name: 1 } },
      { $limit: limit },
    ]);

    const viewsByGuestCity = await NewsInteraction.aggregate([
      { $match: { action: "view" } },
      { $lookup: { from: "guestusers", localField: "guestId", foreignField: "guestId", as: "guest" } },
      { $unwind: "$guest" },
      { $unwind: { path: "$guest.cityPreferences", preserveNullAndEmptyArrays: false } },
      { $lookup: { from: "cities", localField: "guest.cityPreferences", foreignField: "_id", as: "city" } },
      { $unwind: "$city" },
      {
        $group: {
          _id: "$city._id",
          name: { $first: "$city.name" },
          views: { $sum: 1 },
          uniqueGuests: { $addToSet: "$guestId" },
        },
      },
      { $project: { name: 1, views: 1, uniqueUsers: { $size: "$uniqueGuests" } } },
      { $sort: { views: -1, uniqueUsers: -1 } },
      { $limit: limit },
    ]);

    const actionTrend = await NewsInteraction.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          action: { $in: ["view", "save", "share"] },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            action: "$action",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    return res.json({
      success: true,
      data: {
        totals: {
          ...(totalsAgg[0] || { totalNews: 0, totalViews: 0, totalSaves: 0, totalShares: 0, pinnedNews: 0, breakingNews: 0 }),
          ...(guestTotalsAgg[0] || { totalGuestUsers: 0, notificationsEnabledUsers: 0, androidUsers: 0, iosUsers: 0, webUsers: 0 }),
        },
        topNewsByViews: getTopList(topNewsByViews.map((item) => item.toObject()), limit),
        topNewsBySaves: getTopList(topNewsBySaves.map((item) => item.toObject()), limit),
        topNewsByShares: getTopList(topNewsByShares.map((item) => item.toObject()), limit),
        topCategories: getTopList(topCategories, limit),
        topHashtags: getTopList(topHashtags, limit),
        topNewsCities: getTopList(topNewsCities, limit),
        topUserCities: getTopList(topUserCities, limit),
        viewsByGuestCity: getTopList(viewsByGuestCity, limit),
        actionTrend,
      },
    });
  } catch (error) {
    console.error("Get analytics dashboard error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const trackNewsInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { guestId, action, metadata } = req.body;

    if (!guestId || !action) {
      return res.status(400).json({ success: false, message: "guestId and action are required" });
    }

    if (!["view", "save", "unsave", "share"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid interaction action" });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    let changed = false;

    if (action === "view") {
      const existingView = await NewsInteraction.findOne({ news: id, guestId, action: "view" });
      if (!existingView) {
        await NewsInteraction.create({ news: id, guestId, action: "view", metadata: metadata || {} });
        await News.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        changed = true;
      }
    }

    if (action === "save") {
      const activeSave = await NewsInteraction.findOne({ news: id, guestId, action: "save", isActive: true });
      if (!activeSave) {
        await NewsInteraction.create({ news: id, guestId, action: "save", isActive: true, metadata: metadata || {} });
        await News.findByIdAndUpdate(id, { $inc: { saveCount: 1 } });
        changed = true;
      }
    }

    if (action === "unsave") {
      const activeSave = await NewsInteraction.findOne({ news: id, guestId, action: "save", isActive: true }).sort({ createdAt: -1 });
      if (activeSave) {
        activeSave.isActive = false;
        await activeSave.save();
        await NewsInteraction.create({ news: id, guestId, action: "unsave", isActive: true, metadata: metadata || {} });
        await News.findByIdAndUpdate(id, { $inc: { saveCount: -1 } });
        await News.updateOne({ _id: id, saveCount: { $lt: 0 } }, { $set: { saveCount: 0 } });
        changed = true;
      }
    }

    if (action === "share") {
      await NewsInteraction.create({ news: id, guestId, action: "share", metadata: metadata || {} });
      await News.findByIdAndUpdate(id, { $inc: { shareCount: 1 } });
      changed = true;
    }

    const updatedNews = await News.findById(id).select("viewCount saveCount shareCount");

    return res.json({
      success: true,
      message: changed ? "Interaction tracked" : "Interaction already tracked",
      data: {
        newsId: id,
        action,
        changed,
        viewCount: updatedNews?.viewCount || 0,
        saveCount: updatedNews?.saveCount || 0,
        shareCount: updatedNews?.shareCount || 0,
      },
    });
  } catch (error) {
    console.error("Track news interaction error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews,
  getNewsAnalytics,
  getAnalyticsDashboard,
  trackNewsInteraction,
  reorderNews,
  togglePinNews,
};
