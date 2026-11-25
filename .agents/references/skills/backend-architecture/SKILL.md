---
name: backend-architecture
description: Understand the Express backend structure, startup, MongoDB models, API conventions and safe development workflow.
---

# Backend Architecture

## Architecture
- CommonJS JavaScript (`require`, `module.exports`), Express 5.2, Mongoose 9.6 / MongoDB driver 7, npm. No TypeScript or Prisma.
- `src/index.js` loads dotenv, validates environment, connects MongoDB, installs security, CORS, body parsers and sanitization, mounts routes, and starts listening (PORT default 5000). Trust proxy is 1. JSON and URL-encoded limits are 1 MB; multipart is separate.
- Request path: `src/routes/*Routes.js` -> middleware -> `src/controllers/*Controller.js` -> `src/models/*.js` or `src/services/*.js`. Keep current controller organization; do not introduce a new framework for a small change.
- `src/config/db.js` connects with `MONGO_URI`, disables autoIndex in production and calls `ensureGuestUserIndexes`. Production connection failures exit; development logs failures. Startup can mutate guest indexes, so never start against production merely to test.
- Most responses are `{success, data, message?}`; settings use `settings`, news writes may include `notification`. Do not impose a global envelope migration.
- Mongo document IDs use `_id`, timestamps use `createdAt`, `updatedAt`; use ObjectId validation and existing population shapes. Keep model defaults and indexes compatible with existing records.

## Model map
- Admin: identity, role, password and verification/reset state; News.createdBy references Admin.
- News: category (legacy singular) plus categories array, cities, media subdocuments, pin/order/visibility, counters; NewsInteraction references News and stores guestId string.
- Category: unique name, sequence, visibility and highlight; Country -> State -> City (City references both State and Country).
- Advertisement: cities/categories references, banner and redirect URL, position and counts; Embed: categories references and embedCode, height, position and counts.
- GuestUser: unique guestId, device subdocuments, root compatibility fields, city preferences; Setting: app media and appUpdates.

## Workflow
1. Read route and actual controller before editing; read model, middleware and caller as needed.
2. Preserve HTTP methods, status codes, field names, response shapes, role rules and mobile compatibility unless change requested.
3. For new APIs validate input, reject unauthorized calls, use explicit field allowlists and bounded queries. Put fixed routes before parameter routes.
4. `npm ci` in a clean environment if dependencies needed; `npm run dev` for local development, `npm start` for normal startup. No test script exists in package.json.
5. Run `node --check` on changed JS, then test with isolated database and stubbed external services. Never send actual pushes or emails for testing without approval. Report tests not run.
