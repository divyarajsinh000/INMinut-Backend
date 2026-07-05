const express = require("express");
const {
  createEmbed,
  getEmbeds,
  getEmbedById,
  updateEmbed,
  deleteEmbed,
  toggleEmbed,
  trackEmbedInteraction,
} = require("../controllers/embedController");
const { auth, authorize } = require("../middlewares/auth");

const { trackLimiter } = require("../middlewares/security");

const router = express.Router();

router.get("/", getEmbeds);
router.get("/:id", getEmbedById);
router.post("/", auth, authorize("super-admin", "editor"), createEmbed);
router.put("/:id", auth, authorize("super-admin", "editor"), updateEmbed);
router.patch("/:id/toggle", auth, authorize("super-admin", "editor"), toggleEmbed);
router.delete("/:id", auth, authorize("super-admin"), deleteEmbed);
router.post("/:id/track", trackLimiter, trackEmbedInteraction);

module.exports = router;
