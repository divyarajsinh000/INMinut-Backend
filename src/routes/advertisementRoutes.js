const express = require("express");
const {
  createAdvertisement,
  getAdvertisements,
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisement,
  trackAdInteraction,
} = require("../controllers/advertisementController");
const { auth, authorize } = require("../middlewares/auth");
const upload = require("../config/multer");
const { trackLimiter } = require("../middlewares/security");
const { validateObjectIds } = require("../middlewares/validateInput");

const router = express.Router();

router.get("/", getAdvertisements);
router.get("/:id", validateObjectIds("id"), getAdvertisementById);
router.post("/", auth, authorize("super-admin", "editor"), upload.single("bannerImage"), createAdvertisement);
router.put("/:id", auth, authorize("super-admin", "editor"), validateObjectIds("id"), upload.single("bannerImage"), updateAdvertisement);
router.patch("/:id/toggle", auth, authorize("super-admin", "editor"), validateObjectIds("id"), toggleAdvertisement);
router.delete("/:id", auth, authorize("super-admin"), validateObjectIds("id"), deleteAdvertisement);
router.post("/:id/track", trackLimiter, validateObjectIds("id"), trackAdInteraction);

module.exports = router;
