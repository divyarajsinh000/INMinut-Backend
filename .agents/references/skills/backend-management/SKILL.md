---
name: backend-management
description: Change category, country/state/city, advertisements, embeds, settings or app-update APIs and data models.
---

# Backend Management

## Category and location
- `/api/categories`: GET public (includeHidden), POST, PUT /reorder `{orderedIds}`, PUT/DELETE /:id super-admin. Category fields name (unique), backgroundColor, textColor, sequence, isHighlighted, isVisible.
- `/api/locations/{countries,states,cities}`: GET public (all=true includes inactive); POST, PUT /reorder `{orderedIds}`, PUT/DELETE /:id super-admin. State filter country; city filters country/state. Country has code, sequence, isActive; State references Country; City references both State/Country; compound uniqueness by name and parents. Check parent consistency and deletion rules in locationController before altering hierarchy.

## Ads and embeds
- `/api/advertisements` and `/api/embeds`: GET / and /:id public. POST /, PUT /:id, PATCH /:id/toggle super-admin/editor; DELETE /:id super-admin. POST /:id/track public with `{action:'view'|'click'}`. Keep separate from news interaction contract.
- Ad uses multipart `bannerImage`, name, label, redirectUrl, positionAfterNews (default 4), isEnabled, cities/categories. Empty cities means global. GET supports enabledOnly, city/cityId/cityIds and sort=recent. Use sanitizer and existing storage cleanup.
- Embed fields title, embedCode, height (default 250), positionAfterNews (default 5), isEnabled, categories. GET enabledOnly, search, sort=recent. Preserve intentional embed markup only where necessary; render with safe client isolation and avoid broad sanitizer exemptions.
- Both maintain viewCount/clickCount and category references. Validate URLs, array IDs, positions and permissions.

## Settings
- `/api/settings` GET public -> `{success,settings}` (creates default record if missing). PUT / super-admin multipart fields appLogo, appIcon, defaultNewsImage, defaultShareImage, each maxCount 1. Relative media URLs normalized.
- PUT /app-updates super-admin JSON `{appUpdates:{android:{latestVersion,minimumVersion,storeUrl},ios:{latestVersion,minimumVersion,storeUrl},updateMessage}}`. Version format x.y.z or empty; nonempty store URLs must start HTTPS; message capped 500 chars. Both platform objects required. Do not confuse latest/minimum version or introduce semver changes without checking mobile consumer.
