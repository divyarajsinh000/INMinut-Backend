const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const ADMIN_ROLES = ["super-admin", "editor", "reporter"];


const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (role && !ADMIN_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: role || "editor",
    });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "30d",
    });

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token,
      },
    });
  } catch (error) {
    console.error("Register admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "30d",
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token,
      },
    });
  } catch (error) {
    console.error("Login admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
    console.error("Get me error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
    console.error("Get admins error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
    console.error("Get admin by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

    const updateData = { name, email, role };
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.json({
      success: true,
      message: "Admin updated successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Update admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

    return res.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      updateData.profileImage = `/uploads/images/${req.file.filename}`;
    }

    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      updateData,
      { new: true }
    ).select("-password");

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: admin,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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
};
