const express = require("express");

const guestUserController = require("../controllers/guestUserController");
const {
  updateDeviceNotificationsByAdmin,
  bulkUpdateNotificationsByAdmin,
} = require("../controllers/guestNotificationAdminController");

const { auth, authorize } = require("../middlewares/auth");
const {
  guestLimiter,
  adminLimiter,
} = require("../middlewares/security");

const router = express.Router();

const missingHandler = (handlerName) => {
  return (req, res) => {
    console.error(
      `Missing controller handler "${handlerName}" in guestUserController.js`
    );

    return res.status(501).json({
      success: false,
      message: `Backend handler "${handlerName}" is not configured`,
    });
  };
};

const getHandler = (names) => {
  for (const name of names) {
    if (typeof guestUserController[name] === "function") {
      return guestUserController[name];
    }
  }

  return missingHandler(names[0]);
};

const registerGuestUser = getHandler([
  "registerGuestUser",
  "createOrUpdateGuestUser",
  "registerGuest",
]);

const getGuestUsers = getHandler([
  "getGuestUsers",
  "getAllGuestUsers",
]);

const updateGuestNotificationPreference = getHandler([
  "updateGuestNotificationPreference",
  "updateNotificationPreference",
]);

const updateGuestCityPreferences = getHandler([
  "updateGuestCityPreferences",
  "updateCityPreferences",
]);

const deleteGuestUser = getHandler([
  "deleteGuestUser",
  "deleteGuest",
]);

/*
|--------------------------------------------------------------------------
| Admin notification-management routes
|--------------------------------------------------------------------------
| Keep these fixed routes before routes containing "/:id" or "/:guestId".
*/

router.patch(
  "/notifications/bulk",
  auth,
  authorize("super-admin", "editor"),
  adminLimiter,
  bulkUpdateNotificationsByAdmin
);

router.patch(
  "/:id/devices/:deviceIdentifier/notifications",
  auth,
  authorize("super-admin", "editor"),
  adminLimiter,
  updateDeviceNotificationsByAdmin
);

/*
|--------------------------------------------------------------------------
| Admin guest-device routes
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  auth,
  authorize("super-admin", "editor"),
  adminLimiter,
  getGuestUsers
);

router.delete(
  "/:id",
  auth,
  authorize("super-admin"),
  adminLimiter,
  deleteGuestUser
);

/*
|--------------------------------------------------------------------------
| Mobile app guest routes
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  guestLimiter,
  registerGuestUser
);

router.patch(
  "/:guestId/notifications",
  guestLimiter,
  updateGuestNotificationPreference
);

router.patch(
  "/:guestId/cities",
  guestLimiter,
  updateGuestCityPreferences
);

module.exports = router;
