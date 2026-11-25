---
name: backend-news
description: Change news create/edit/list, media, ordering, publishing, filters or reporter permissions while retaining existing API contracts.
---

# Backend News

## Sources
`src/routes/newsRoutes.js`, `src/controllers/newsController.js`, `src/models/News.js`, `src/config/multer.js`, `src/utils/s3.js`, `src/services/notificationService.js`.

## Contracts under /api/news
- GET / and GET /:id public with optionalAuth; inactive news hidden from anonymous requests. GET / with authenticated includeInactive=true enables admin list; reporter sees own records in this mode.
- POST / and PUT /:id all admin roles, multipart `media` array. Reporters may edit only own createdBy records; editors and super-admins can manage all. DELETE /:id super-admin only.
- PATCH /reorder `{orderedIds}`, PATCH /:id/toggle-pin, PATCH /:id/toggle-active: super-admin/editor. Analytics and tracking in backend-analytics skill.
- List returns `{success:true,data:[...]}` without backend pagination. Filters: category, search, cityIds or city, stateId, dateFilter, date, startDate, endDate, sortBy, onlyWithMetric, includeInactive. Category matches singular category or categories. City/state filters use active state cities and intersect selected cities. Do not silently invent page/results/count contract.
- Search: `+` separates AND terms (encode literal plus as %2B); ordinary multiword phrase stays intact. Up to six terms, 120 chars each; regex escaped; searches title, description, content, hashtags, reporter and matching Admin names/emails. Full date search uses UTC days; explicit published-date filters use IST day boundaries. Preserve distinction unless intentionally fixing it.
- Date filters accept today/all or YYYY-MM-DD date/range; conflicting filters or reversed range return 400. Manual order is pinned first, pinOrder, sortOrder, then publishedDate/createdAt descending. Metric sorting uses views/saves/shares; onlyWithMetric restricts counts >0.

## Write behavior
- News supports title/titleLink/titleColor/titleFontSize, description/descriptionFontSize/content, category, cities, hashtags, reporter display, breaking text/colors/blink, active/pinned, dates and media. Font sizes clamped 10–60 title and 10–40 description. `createdBy` derived from req.admin; reporter display based on createdBy when populated. Schema has categories but current create/update explicitly write singular category; do not assume multi-category writes exist.
- Media shape `{_id,url,type,originalName}` with type image/video/pdf. For edit pass `mediaToKeep` array of existing media subdocument IDs (JSON string in multipart); omitted/empty means existing media removed, not retained. New uploads append. Keep original filename normalization and local/S3 deletion support. Avoid deleting files until validation succeeds in future changes; consider cleanup on failed DB writes.
- Create sends notification for active news; edit `sendNotification` defaults true for old clients, false skips; inactive news skips. Turning active on can notify. Notification result is separate from successful persistence; do not turn push failures into duplicate news creation.
- Test reporter ownership, active/inactive list, zero metrics, date boundaries, city/state intersection, media retain/remove, pin ordering, and notification opt-out.
