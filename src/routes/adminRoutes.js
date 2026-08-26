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
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/adminController");
const { auth, authorize } = require("../middlewares/auth");
const {
  loginLimiter,
  passwordResetLimiter,
  emailVerifyLimiter,
} = require("../middlewares/security");
const { validateObjectIds } = require("../middlewares/validateInput");
const upload = require("../config/multer");

const router = express.Router();

// Registration is restricted to super-admins
router.post("/register", auth, authorize("super-admin"), registerAdmin);
router.post("/login", loginLimiter, loginAdmin);
router.get("/me", auth, getMe);
router.put("/profile/update", auth, upload.single("profileImage"), updateProfile);

// Password recovery & email verification routes
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.post("/verify-email", emailVerifyLimiter, verifyEmail);
router.post("/resend-verification", emailVerifyLimiter, resendVerificationEmail);

// Admin management routes (super-admin only)
router.get("/", auth, authorize("super-admin"), getAdmins);
router.get("/:id", auth, authorize("super-admin"), validateObjectIds("id"), getAdminById);
router.put("/:id", auth, authorize("super-admin"), validateObjectIds("id"), updateAdmin);
router.delete("/:id", auth, authorize("super-admin"), validateObjectIds("id"), deleteAdmin);

module.exports = router;
