---
name: backend-admin-integration
description: Coordinate backend API changes with the INMinut React admin frontend and mobile compatibility; inspect role and response mismatches.
---

# Backend Admin Integration

## Frontend snapshot evidence
The separately supplied INMinut-Admin archive contains `src/api/axiosInstance.js`, `src/context/AuthContext.jsx`, `src/context/SettingsContext.jsx`, `src/App.jsx`, `src/components/ProtectedRoute.jsx` and pages below. It may be in a different repo; do not assume an absolute local path. Mobile source was not supplied.
- Axios normalizes relative paths to /api once and adds Bearer token. 401 (except login) clears token and fires admin-session-expired. AuthContext login reads res.data.data.token, /admin/me reads res.data.data, 30-minute idle timeout. Preserve these semantics.
- NewsList/AddNews/EditNews -> news list/create/edit/pin/reorder/active and media. Analytics/Dashboard -> analytics. CategoryList/AddCategory/EditCategory -> categories. Locations -> countries/states/cities. AdvertisementList/AddAdvertisement/EditAdvertisement -> advertisements. EmbedList/AddEmbed/EditEmbed -> embeds. GuestUsers -> guest stats/list and notification settings. Users/AddUser/EditUser/Profile/Login -> admin. Settings/SettingsContext -> settings.
- Check frontend request method, query names, FormData fields and response extraction before changing APIs. Do not confuse backend `_id` with generic `id`. Public settings response is `settings`, not `data`.
- Observed permission mismatch: admin App.jsx restricts advertisement routes and guest-users page to super-admin, whereas backend allows editors to create/update/toggle ads and list/manage guest notifications. Frontend users page is super-admin while backend admin list allows all roles. These are differences to review, not authorization changes to make automatically.
- Verify both frontend route guards/sidebar and backend `authorize` when asked to change roles; backend is enforcement boundary. Preserve mobile guest contracts and legacy fields; no mobile UI source is verified.
- For breaking changes propose migration/compatibility first, update both repos when supplied, and list files touched. Do not copy frontend code into backend.
