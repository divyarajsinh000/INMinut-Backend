---
name: backend-guests-notifications
description: Change guest registration, device identity, guest preferences, admin device management, Expo or Firebase notifications and indexes.
---

# Backend Guests Notifications

## Sources
`guestUserRoutes.js`, `guestUserController.js`, `guestNotificationAdminController.js`, `models/GuestUser.js`, `services/notificationService.js`, `services/firebaseAdmin.js`, `utils/ensureGuestUserIndexes.js` (all under src, in their respective directories).

## API under /api/guest-users
- POST / public registration: guestId, deviceId, fcmToken, expoPushToken, platform, deviceName, appVersion, notificationsEnabled, cityPreferences. Returns persisted guest in data. Existing record matching uses device/token then guest identity; normalizes tokens, derives fallback deviceId/guestId. Do not collapse distinct devices onto one root token.
- PATCH /:guestId/notifications supports deviceId, notificationsEnabled and cityPreferences; PATCH /:guestId/cities uses compatibility handler fallback to notification preference handler. Public mobile routes use guestLimiter; keep client compatibility while reviewing identity/ownership before expanding them.
- GET / and GET /stats: super-admin/editor; DELETE /:id super-admin. Admin PATCH /notifications/bulk and PATCH /:id/devices/:deviceIdentifier/notifications: super-admin/editor, body `{enabled:boolean}`. Bulk affects all guest records; individual identifier matches deviceId or device subdocument _id. Keep fixed route ordering. Route compatibility resolver returns 501 for absent handlers.
- GuestUser.guestId unique; devices array stores deviceId, FCM/Expo tokens, platform/name/version, permission and lastSeenAt. Root fields are latest-device legacy summaries; never make root token fields unique (blank tokens valid). Startup index utility drops obsolete root token indexes and unsafe unique device indexes, then syncIndexes. Do not run on production without review.

## Delivery behavior
- Empty news cities -> all city preferences; user with empty preferences receives city-specific news too; otherwise intersection of city IDs.
- Collect enabled device tokens independently of root flag; legacy root tokens supported, valid Expo token preferred over FCM for each entry, deduplicate each provider. Preserve per-device preferences; root summary must not suppress another enabled device.
- Expo HTTP push and Firebase Admin FCM are separate paths; aggregate sent/failed/skipped and target counts. Invalid token cleanup in service; do not log full tokens or send real pushes in tests.
- Review known edge case: root legacy token can duplicate a disabled device while another device keeps root enabled. Verify/fix explicitly before changing delivery behavior. Guest notification preference currently uses Boolean on input, so string false may be treated as true; prefer actual booleans in clients.
- Test multi-device re-registration, missing/rotated tokens, per-device disable, bulk toggle, city targeting, Expo vs FCM selection, stale-token cleanup, no credentials and provider failure.
