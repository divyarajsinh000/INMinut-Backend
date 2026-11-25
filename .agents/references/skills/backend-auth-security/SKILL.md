---
name: backend-auth-security
description: Change admin authentication, JWT, permissions, account recovery, validation, rate limits and security without weakening safeguards.
---

# Backend Auth Security

## Sources
`src/routes/adminRoutes.js`, `src/controllers/adminController.js`, `src/models/Admin.js`, `src/middlewares/auth.js`, `security.js`, `botProtection.js`, `httpsEnforcer.js`, `validateInput.js`, `src/utils/sanitizer.js`, `src/config/envValidation.js`, `src/services/emailService.js`.

## Authentication contracts (prefix /api/admin)
- POST /login `{email,password}` -> `data` with `_id,name,email,role,isEmailVerified,profileImage,token`. JWT signs `{id}`; JWT_EXPIRES_IN defaults to 24h. Invalid credentials currently 400; locked account 429.
- GET /me authenticated; PUT /profile/update authenticated, multipart `profileImage`, optional name/email/password/currentPassword.
- POST /register super-admin only. GET / all three roles; GET/PUT/DELETE /:id super-admin only. Do not infer permission from UI alone.
- POST /forgot-password `{email}`, /reset-password `{token,newPassword}`, /verify-email `{token}`, /resend-verification `{email}` have specialized rate limits.
- `auth` reads Authorization Bearer token, checks admin and passwordChangedAt; `optionalAuth` continues anonymously on invalid token. `authorize(...roles)` returns 401 without identity, 403 with disallowed role.
- Admin password save hook bcrypt cost 12; 5 failed login attempts lock account 15 minutes. Reset token hashed SHA256 with one-hour expiry; email verification token 24 hours. Preserve password save hook; do not use direct update for plaintext password. Login currently reports verification state but does not require verified email.

## Security invariants
- Keep production HTTPS, Helmet, CORS origin allowlist, bot protection, sanitization, rate limiting and logger. Global API limiter and specialized limiters coexist (login 5/15 min, AI 10/15 min, guest 30/hour, tracking 700/15 min as configured).
- Sanitize user strings and escape regex search; validate ObjectIds and explicitly parse booleans, arrays, numeric limits. Validate multipart fields after parsing as applicable; avoid passing arbitrary req.body or req.query to Mongo.
- Never return passwords, reset/verification tokens, private keys or raw internal errors in new code. Avoid logging secrets or device tokens. Do not weaken authorization or remove security controls to fix a client 401/403/429.
- Env values intentionally omitted in supplied project; never reconstruct or copy secrets. `JWT_SECRET` and `MONGO_URI` mandatory; production JWT minimum 32 characters; read envValidation and service code for other requirements. Use local dummy values only in isolated tests.
- Verify unauthenticated, wrong role, invalid ID, expired JWT, password change and lockout behavior. Review authorization ownership at controller level too.
