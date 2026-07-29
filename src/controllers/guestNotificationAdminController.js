const GuestUser = require("../models/GuestUser");

const parseEnabled = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return null;
};

const updateDeviceNotificationsByAdmin = async (req, res) => {
  try {
    const enabled = parseEnabled(req.body.enabled);
    const { id, deviceIdentifier } = req.params;

    if (enabled === null) {
      return res.status(400).json({
        success: false,
        message: "enabled must be true or false",
      });
    }

    const guest = await GuestUser.findById(id);

    if (!guest) {
      return res.status(404).json({
        success: false,
        message: "Guest user not found",
      });
    }

    const device = guest.devices?.find((item) => {
      const mongoId = item._id?.toString();
      return item.deviceId === deviceIdentifier || mongoId === deviceIdentifier;
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    device.notificationsEnabled = enabled;

    // Keep the legacy parent value synchronized for old notification services.
    guest.notificationsEnabled = guest.devices.some(
      (item) => item.notificationsEnabled !== false
    );

    await guest.save();

    return res.json({
      success: true,
      message: `Notifications ${enabled ? "enabled" : "disabled"} for this device`,
      data: guest,
    });
  } catch (error) {
    console.error("Admin device notification update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const bulkUpdateNotificationsByAdmin = async (req, res) => {
  try {
    const enabled = parseEnabled(req.body.enabled);

    if (enabled === null) {
      return res.status(400).json({
        success: false,
        message: "enabled must be true or false",
      });
    }

    const guests = await GuestUser.find({});

    await Promise.all(
      guests.map(async (guest) => {
        if (Array.isArray(guest.devices)) {
          guest.devices.forEach((device) => {
            device.notificationsEnabled = enabled;
          });
        }

        guest.notificationsEnabled = enabled;
        await guest.save();
      })
    );

    return res.json({
      success: true,
      message: `Notifications ${enabled ? "enabled" : "disabled"} for all devices`,
      data: { updatedGuestUsers: guests.length },
    });
  } catch (error) {
    console.error("Bulk admin notification update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  updateDeviceNotificationsByAdmin,
  bulkUpdateNotificationsByAdmin,
};
