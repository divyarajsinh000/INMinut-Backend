const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");
const logger = require("../utils/logger");

const ADMIN_ROLES = ["super-admin", "editor", "reporter"];

const validatePasswordComplexity = (password) => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
};

const generateAdminToken = (adminId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || "24h";
  return jwt.sign({ id: adminId }, secret, { expiresIn });
};

const getUploadedFileUrl = (file) => {
  if (!file) return null;

  if (file.location) return file.location;
  if (file.url) return file.url;
  if (file.filename) return `/uploads/images/${file.filename}`;

  return null;
};

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      logger.logAuthFailure(req, "Registration missing required fields", { email });
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!validatePasswordComplexity(password)) {
      logger.logAuthFailure(req, "Registration password complexity validation failed", { email });
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain both letters and numbers",
      });
    }

    if (role && !ADMIN_ROLES.includes(role)) {
      logger.logAuthFailure(req, `Registration invalid role string '${role}'`, { email });
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      logger.logAuthFailure(req, "Registration email already exists", { email });
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const admin = new Admin({
      name,
      email: email.toLowerCase(),
      password,
      role: role || "editor",
    });

    const verificationToken = admin.createEmailVerificationToken();
    await admin.save();

    try {
      await sendVerificationEmail(admin.email, verificationToken);
    } catch (mailError) {
      logger.error("Verification email failed to send", { email: admin.email, error: mailError.message });
    }

    const token = generateAdminToken(admin._id);

    logger.logAuthSuccess(req, {
      userId: admin._id,
      email: admin.email,
      role: admin.role,
      action: "REGISTER",
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully. A verification link has been sent to your email.",
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isEmailVerified: admin.isEmailVerified,
        profileImage: admin.profileImage || "",
        token,
      },
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.logAuthFailure(req, "Missing email or password in login payload", { email });
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const admin = await Admin.findOne({ email: normalizedEmail }).select("+failedLoginAttempts +lockUntil");

    if (!admin) {
      logger.logAuthFailure(req, "Invalid credentials - account does not exist", { email: normalizedEmail });
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (admin.isLocked()) {
      const remainingMinutes = Math.ceil((admin.lockUntil.getTime() - Date.now()) / (60 * 1000));
      logger.logAuthFailure(req, `Account temporarily locked. Remaining: ${remainingMinutes}m`, { email: normalizedEmail });
      return res.status(429).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minutes.`,
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await admin.incLoginAttempts();
      if (admin.isLocked()) {
        logger.logSecurityEvent(
          req,
          "ACCOUNT_LOCKOUT_TRIGGERED",
          `Account [${normalizedEmail}] locked for 15 minutes after 5 consecutive failed login attempts.`,
          { email: normalizedEmail }
        );
      }
      logger.logAuthFailure(req, "Invalid credentials - password incorrect", { email: normalizedEmail });
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    await admin.resetLoginAttempts();
    const token = generateAdminToken(admin._id);

    logger.logAuthSuccess(req, {
      userId: admin._id,
      email: admin.email,
      role: admin.role,
      action: "LOGIN",
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isEmailVerified: admin.isEmailVerified,
        profileImage: admin.profileImage || "",
        token,
      },
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select("-password");
    return res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    if (role && !ADMIN_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase();
    if (role) admin.role = role;

    if (password) {
      if (!validatePasswordComplexity(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long and contain both letters and numbers",
        });
      }
      admin.password = password;
    }

    await admin.save();

    logger.info(`Admin account (${admin.email}) updated by super-admin (${req.admin.email})`, {
      targetUserId: admin._id,
      updatedBy: req.admin._id,
    });

    const updatedAdmin = await Admin.findById(id).select("-password");

    return res.json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    logger.info(`Admin account (${admin.email}) deleted by super-admin (${req.admin.email})`, {
      deletedUserId: id,
      deletedBy: req.admin._id,
    });

    return res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, password, currentPassword } = req.body;
    const admin = await Admin.findById(req.admin._id).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found",
      });
    }

    if (password) {
      if (!currentPassword) {
        logger.logAuthFailure(req, "Profile password update missing current password", { email: admin.email });
        return res.status(400).json({
          success: false,
          message: "Current password is required to set a new password",
        });
      }

      const isCurrentValid = await admin.comparePassword(currentPassword);
      if (!isCurrentValid) {
        logger.logAuthFailure(req, "Profile password update current password incorrect", { email: admin.email });
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      if (!validatePasswordComplexity(password)) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters long and contain both letters and numbers",
        });
      }

      admin.password = password;
      logger.info(`Admin profile password updated for (${admin.email})`, { userId: admin._id });
    }

    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase();

    if (req.file) {
      const uploadedUrl = getUploadedFileUrl(req.file);
      if (uploadedUrl) {
        admin.profileImage = uploadedUrl;
      }
    }

    await admin.save();

    const sanitizedAdmin = await Admin.findById(admin._id).select("-password");

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: sanitizedAdmin,
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (admin) {
      const resetToken = admin.createPasswordResetToken();
      await admin.save();

      try {
        await sendPasswordResetEmail(admin.email, resetToken);
      } catch (mailErr) {
        logger.error("Failed to send password reset email", { email: admin.email, error: mailErr.message });
      }
    }

    logger.info(`Password reset requested for email: ${email}`, { email });

    return res.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (!validatePasswordComplexity(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain both letters and numbers",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!admin) {
      logger.logAuthFailure(req, "Invalid or expired password reset token", {});
      return res.status(400).json({
        success: false,
        message: "Password reset token is invalid or has expired",
      });
    }

    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;

    await admin.save();

    logger.logAuthSuccess(req, {
      userId: admin._id,
      email: admin.email,
      action: "PASSWORD_RESET_COMPLETED",
    });

    return res.json({
      success: true,
      message: "Password has been successfully reset. Please log in with your new password.",
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!admin) {
      logger.logAuthFailure(req, "Invalid or expired email verification token", {});
      return res.status(400).json({
        success: false,
        message: "Verification token is invalid or has expired",
      });
    }

    admin.isEmailVerified = true;
    admin.emailVerificationToken = undefined;
    admin.emailVerificationExpires = undefined;

    await admin.save();

    logger.logAuthSuccess(req, {
      userId: admin._id,
      email: admin.email,
      action: "EMAIL_VERIFIED",
    });

    return res.json({
      success: true,
      message: "Email address has been successfully verified.",
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const email = req.body?.email || req.admin?.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    if (admin.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email address is already verified",
      });
    }

    const verificationToken = admin.createEmailVerificationToken();
    await admin.save();

    await sendVerificationEmail(admin.email, verificationToken);

    logger.info(`Resent email verification to: ${admin.email}`, { email: admin.email, userId: admin._id });

    return res.json({
      success: true,
      message: "A new email verification link has been sent.",
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
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
};
