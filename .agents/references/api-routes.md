# Backend route reference

Source: src/index.js and src/routes/*.js. Read controllers for body/response details. Roles and middleware below are copied from route declarations; handler internals may further restrict access.

## /api/admin
`src/routes/adminRoutes.js`

- `POST /api/admin/register` — `auth, authorize("super-admin"), registerAdmin`
- `POST /api/admin/login` — `loginLimiter, loginAdmin`
- `GET /api/admin/me` — `auth, getMe`
- `PUT /api/admin/profile/update` — `auth, upload.single("profileImage"), updateProfile`
- `POST /api/admin/forgot-password` — `passwordResetLimiter, forgotPassword`
- `POST /api/admin/reset-password` — `passwordResetLimiter, resetPassword`
- `POST /api/admin/verify-email` — `emailVerifyLimiter, verifyEmail`
- `POST /api/admin/resend-verification` — `emailVerifyLimiter, resendVerificationEmail`
- `GET /api/admin` — `auth, authorize("super-admin", "editor", "reporter"), getAdmins`
- `GET /api/admin/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), getAdminById`
- `PUT /api/admin/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), updateAdmin`
- `DELETE /api/admin/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteAdmin`

## /api/categories
`src/routes/categoryRoutes.js`

- `POST /api/categories` — `auth, authorize("super-admin"), createCategory`
- `GET /api/categories` — `getCategories`
- `PUT /api/categories/reorder` — `auth, authorize("super-admin"), reorderCategories`
- `PUT /api/categories/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), updateCategory`
- `DELETE /api/categories/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteCategory`

## /api/news
`src/routes/newsRoutes.js`

- `POST /api/news` — `auth, authorize("super-admin", "editor", "reporter"), upload.array("media"), createNews`
- `GET /api/news` — `publicLimiter, optionalAuth, getNews`
- `GET /api/news/analytics/summary` — `auth, authorize("super-admin", "editor"), getNewsAnalytics`
- `GET /api/news/analytics/dashboard` — `auth, authorize("super-admin", "editor"), getAnalyticsDashboard`
- `PATCH /api/news/reorder` — `auth, authorize("super-admin", "editor"), reorderNews`
- `PATCH /api/news/:id/toggle-pin` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), togglePinNews`
- `PATCH /api/news/:id/toggle-active` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), toggleActiveNews`
- `POST /api/news/:id/track` — `trackLimiter, validateObjectIds("id"), trackNewsInteraction`
- `GET /api/news/:id` — `publicLimiter, optionalAuth, validateObjectIds("id"), getNewsById`
- `PUT /api/news/:id` — `auth, authorize("super-admin", "editor", "reporter"), validateObjectIds("id"), upload.array("media"), updateNews`
- `DELETE /api/news/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteNews`

## /api/guest-users
`src/routes/guestUserRoutes.js`

- `PATCH /api/guest-users/notifications/bulk` — `auth, authorize("super-admin", "editor"), adminLimiter, bulkUpdateNotificationsByAdmin`
- `PATCH /api/guest-users/:id/devices/:deviceIdentifier/notifications` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), adminLimiter, updateDeviceNotificationsByAdmin`
- `GET /api/guest-users/stats` — `auth, authorize("super-admin", "editor"), adminLimiter, guestUserController.getDeviceStats`
- `GET /api/guest-users` — `auth, authorize("super-admin", "editor"), adminLimiter, getGuestUsers`
- `DELETE /api/guest-users/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), adminLimiter, deleteGuestUser`
- `POST /api/guest-users` — `guestLimiter, registerGuestUser`
- `PATCH /api/guest-users/:guestId/notifications` — `guestLimiter, updateGuestNotificationPreference`
- `PATCH /api/guest-users/:guestId/cities` — `guestLimiter, updateGuestCityPreferences`

## /api/locations
`src/routes/locationRoutes.js`

- `GET /api/locations/countries` — `getCountries`
- `PUT /api/locations/countries/reorder` — `auth, authorize("super-admin"), reorderCountries`
- `POST /api/locations/countries` — `auth, authorize("super-admin"), createCountry`
- `PUT /api/locations/countries/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), updateCountry`
- `DELETE /api/locations/countries/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteCountry`
- `GET /api/locations/states` — `getStates`
- `PUT /api/locations/states/reorder` — `auth, authorize("super-admin"), reorderStates`
- `POST /api/locations/states` — `auth, authorize("super-admin"), createState`
- `PUT /api/locations/states/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), updateState`
- `DELETE /api/locations/states/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteState`
- `GET /api/locations/cities` — `getCities`
- `PUT /api/locations/cities/reorder` — `auth, authorize("super-admin"), reorderCities`
- `POST /api/locations/cities` — `auth, authorize("super-admin"), createCity`
- `PUT /api/locations/cities/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), updateCity`
- `DELETE /api/locations/cities/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteCity`

## /api/advertisements
`src/routes/advertisementRoutes.js`

- `GET /api/advertisements` — `getAdvertisements`
- `GET /api/advertisements/:id` — `validateObjectIds("id"), getAdvertisementById`
- `POST /api/advertisements` — `auth, authorize("super-admin", "editor"), upload.single("bannerImage"), createAdvertisement`
- `PUT /api/advertisements/:id` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), upload.single("bannerImage"), updateAdvertisement`
- `PATCH /api/advertisements/:id/toggle` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), toggleAdvertisement`
- `DELETE /api/advertisements/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteAdvertisement`
- `POST /api/advertisements/:id/track` — `trackLimiter, validateObjectIds("id"), trackAdInteraction`

## /api/embeds
`src/routes/embedRoutes.js`

- `GET /api/embeds` — `getEmbeds`
- `GET /api/embeds/:id` — `validateObjectIds("id"), getEmbedById`
- `POST /api/embeds` — `auth, authorize("super-admin", "editor"), createEmbed`
- `PUT /api/embeds/:id` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), updateEmbed`
- `PATCH /api/embeds/:id/toggle` — `auth, authorize("super-admin", "editor"), validateObjectIds("id"), toggleEmbed`
- `DELETE /api/embeds/:id` — `auth, authorize("super-admin"), validateObjectIds("id"), deleteEmbed`
- `POST /api/embeds/:id/track` — `trackLimiter, validateObjectIds("id"), trackEmbedInteraction`

## /api/settings
`src/routes/settingRoutes.js`

- `GET /api/settings` — `getSettings`
- `PUT /api/settings/app-updates` — `auth, authorize("super-admin"), updateAppVersionSettings`
- `PUT /api/settings` — `auth, authorize("super-admin"), upload.fields([ { name: "appLogo", maxCount: 1 }, { name: "appIcon", maxCount: 1 }, { name: "defaultNewsImage", maxCount: 1 }, { name: "defaultShareImage", maxCount: 1 }, ]), updateSettings`

## /api/ai
`src/routes/aiRoutes.js`

- `POST /api/ai/generate` — `auth, authorize("super-admin", "editor", "reporter"), generateContent`
- `POST /api/ai/rewrite-headline` — `auth, authorize("super-admin", "editor", "reporter"), rewriteHeadline`
