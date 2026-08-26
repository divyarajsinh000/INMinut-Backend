const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  return secret;
};

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ success: false, message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({ success: false, message: "Token is not valid" });
    }

    if (admin.isLocked()) {
      return res.status(401).json({ success: false, message: "Account is temporarily locked" });
    }

    if (admin.passwordChangedAt) {
      const passwordChangedTime = parseInt(admin.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < passwordChangedTime) {
        return res.status(401).json({ success: false, message: "Session expired due to password change. Please log in again." });
      }
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Token is not valid" });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      const admin = await Admin.findById(decoded.id).select("-password");
      if (admin && !admin.isLocked()) {
        if (admin.passwordChangedAt) {
          const passwordChangedTime = parseInt(admin.passwordChangedAt.getTime() / 1000, 10);
          if (decoded.iat >= passwordChangedTime) {
            req.admin = admin;
          }
        } else {
          req.admin = admin;
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    next();
  };
};

module.exports = { auth, optionalAuth, authorize };
