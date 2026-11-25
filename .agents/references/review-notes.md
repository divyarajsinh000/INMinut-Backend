# Static review notes — not implemented fixes

The following are observations from the supplied backend and admin source snapshots, not a complete security audit. No application source was changed.

- AI endpoints are deterministic placeholders, not connected to an AI provider.
- `getNews` returns an unpaginated array. Analytics summary totals are global even when list is filtered. News explicit date filters use IST, search-date parsing uses UTC, dashboard uses server-local dates.
- News update treats missing mediaToKeep as empty and deletes omitted existing files before saving DB update; callers must send retained IDs. Review storage cleanup and failure atomicity before changing media code.
- Notification collection supports legacy root tokens in addition to device tokens; a disabled device may still be targeted through a stale enabled root token. Test and correct if requested. Guest preference Boolean coercion can treat string "false" as true. Public guest preference endpoints are keyed by guestId; review ownership protections before extending.
- NewsInteraction check-then-create and counter writes are not atomic; concurrency may cause duplicate events or drift. Current indexes are not unique for the interaction tuple.
- `config/multer.js` fileFilter contains unreachable statements after returning the rejection callback; metadata-only allowlist does not verify actual file content. Dangerous-extension helper exists but is not called in fileFilter. Review separately rather than silently changing upload behavior.
- `envValidation.js` includes placeholder JWT secret values in warning/error text; avoid logging real secret values when modifying. Some controllers expose error.message even in production despite central error handler masking its own 500s.
- Frontend route restrictions differ from backend role rules for advertisements, guest users and admin listing; see integration skill. Do not widen access without approval.

No live database, cloud storage, SMTP, Firebase, Expo, or runtime tests were performed; environment values were intentionally withheld. The archive also contained .git, logs and node_modules; these were excluded from review inputs and deliverables to avoid unnecessary exposure. Consider excluding them in future shared ZIPs; redacting .env alone does not guarantee Git history/logs are secret-free.
