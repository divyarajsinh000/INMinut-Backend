const GuestUser = require("../models/GuestUser");

const OBSOLETE_INDEXES = [
  "fcmToken_1",
  "expoPushToken_1",
];

const SHOULD_DROP_UNIQUE_DEVICE_INDEX = new Set([
  "devices.deviceId_1",
  "devices.expoPushToken_1",
  "devices.fcmToken_1",
]);

const ensureGuestUserIndexes = async () => {
  try {
    const indexes = await GuestUser.collection.indexes();

    for (const index of indexes) {
      const name = index.name;
      const isObsoleteRootTokenIndex = OBSOLETE_INDEXES.includes(name);
      const isUnsafeDeviceUniqueIndex = SHOULD_DROP_UNIQUE_DEVICE_INDEX.has(name) && index.unique;

      if (isObsoleteRootTokenIndex || isUnsafeDeviceUniqueIndex) {
        await GuestUser.collection.dropIndex(name);
        console.log(`Dropped obsolete GuestUser index: ${name}`);
      }
    }

    await GuestUser.syncIndexes();
    console.log("GuestUser indexes verified");
  } catch (error) {
    // Do not crash server, but show the real reason if MongoDB index cleanup fails.
    console.error("GuestUser index cleanup warning:", error.message);
  }
};

module.exports = ensureGuestUserIndexes;
