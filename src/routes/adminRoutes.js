const express = require("express");
const {
  registerAdmin,
  loginAdmin,
  getMe,
  getAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  updateProfile,
} = require("../controllers/adminController");
const { auth, authorize } = require("../middlewares/auth");
const upload = require("../config/multer");

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", auth, getMe);
router.put("/profile/update", auth, upload.single("profileImage"), updateProfile);

router.get("/", auth, authorize("super-admin"), getAdmins);
router.get("/:id", auth, authorize("super-admin"), getAdminById);
router.put("/:id", auth, authorize("super-admin"), updateAdmin);
router.delete("/:id", auth, authorize("super-admin"), deleteAdmin);

module.exports = router;
