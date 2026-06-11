const express = require("express");
const {
  createAdvertisement,
  getAdvertisements,
  getAdvertisementById,
  updateAdvertisement,
  deleteAdvertisement,
  toggleAdvertisement,
} = require("../controllers/advertisementController");
const { auth, authorize } = require("../middlewares/auth");
const upload = require("../config/multer");

const router = express.Router();

router.get("/", getAdvertisements);
router.get("/:id", getAdvertisementById);
router.post("/", auth, authorize("super-admin", "editor"), upload.single("bannerImage"), createAdvertisement);
router.put("/:id", auth, authorize("super-admin", "editor"), upload.single("bannerImage"), updateAdvertisement);
router.patch("/:id/toggle", auth, authorize("super-admin", "editor"), toggleAdvertisement);
router.delete("/:id", auth, authorize("super-admin"), deleteAdvertisement);

module.exports = router;
