---
name: backend-analytics
description: Change news analytics, interaction counters, metric filtering, dashboard aggregates and tracking endpoints.
---

# Backend Analytics

## Sources
`src/controllers/newsController.js` (getNewsAnalytics, getAnalyticsDashboard, trackNewsInteraction), `src/models/NewsInteraction.js`, `src/models/News.js`, `src/routes/newsRoutes.js`.

- GET /api/news/analytics/summary super-admin/editor. Query sortBy (default shareCount), limit, category, search, cityIds/city, onlyWithMetric. Returns data `{totals,news}`. Totals currently aggregate all News records, not the filtered list. Preserve or explicitly coordinate changes with admin UI.
- GET /api/news/analytics/dashboard super-admin/editor. Params period default 1m (today,7d,1m,3m,6m,1y,all,custom), startDate/endDate, status, breaking, pinned, search, limit (clamped 1–50). Current dashboard day boundaries use server-local Date operations, unlike explicit news-list IST filters. Read actual aggregation output before adding/changing fields.
- POST /api/news/:id/track public with rate limiter and valid ObjectId. Body guestId, action, optional metadata. Actions view, save, unsave, share, like, unlike. View once per guest/news in sequential requests; active save/like once until undone; unsave/unlike deactivate previous record, decrement and clamp counter to zero; shares count each request. Response data newsId, action, changed and all four counters.
- Interaction records are event history with isActive; News has cached aggregate counts. Current find-then-create checks and nonunique compound indexes do not guarantee concurrency idempotency; do not claim otherwise. Review transaction/index strategy for a requested concurrency fix.
- Preserve distinctions between event time, news publishedDate, createdAt and current aggregate totals. Test repeat actions, unsave/unlike without active event, no negative counts, range boundaries, empty result, filtering and sorting. Do not create artificial engagement on live data.
