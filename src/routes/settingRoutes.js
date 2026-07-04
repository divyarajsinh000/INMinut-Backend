const express = require("express");
const { getSettings, updateSettings } = require("../controllers/settingsController");
const { auth, authorize } = require("../middlewares/auth");
const upload = require("../config/multer");

const router = express.Router();

router.get("/", getSettings);
router.put(
  "/",
  auth,
  authorize("super-admin"),
  upload.fields([
    { name: "appLogo", maxCount: 1 },
    { name: "appIcon", maxCount: 1 },
    { name: "defaultNewsImage", maxCount: 1 },
    { name: "defaultShareImage", maxCount: 1 },
  ]),
  updateSettings
);

module.exports = router;
