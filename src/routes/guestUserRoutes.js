const express = require("express");
const {
  registerGuestUser,
  updateGuestNotificationPreference,
  getGuestUsers,
  deleteGuestUser,
} = require("../controllers/guestUserController");
const { auth, authorize } = require("../middlewares/auth");
const { guestLimiter } = require("../middlewares/security");

const router = express.Router();

router.post("/register", guestLimiter, registerGuestUser);
router.patch("/:guestId/preferences", updateGuestNotificationPreference);
router.get("/", auth, authorize("super-admin"), getGuestUsers);
router.delete("/:id", auth, authorize("super-admin"), deleteGuestUser);

module.exports = router;
