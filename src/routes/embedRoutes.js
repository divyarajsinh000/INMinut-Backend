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
const { validateObjectIds } = require("../middlewares/validateInput");

const router = express.Router();

router.get("/", getEmbeds);
router.get("/:id", validateObjectIds("id"), getEmbedById);
router.post("/", auth, authorize("super-admin", "editor"), createEmbed);
router.put("/:id", auth, authorize("super-admin", "editor"), validateObjectIds("id"), updateEmbed);
router.patch("/:id/toggle", auth, authorize("super-admin", "editor"), validateObjectIds("id"), toggleEmbed);
router.delete("/:id", auth, authorize("super-admin"), validateObjectIds("id"), deleteEmbed);
router.post("/:id/track", trackLimiter, validateObjectIds("id"), trackEmbedInteraction);

module.exports = router;
