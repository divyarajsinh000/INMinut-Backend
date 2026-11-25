---
name: backend-media-ai-integrations
description: Change uploads, local disk and AWS S3, SMTP/Firebase services, or existing placeholder AI content-generation endpoints.
---

# Backend Media Ai Integrations

## Media
- `src/config/multer.js` wraps single/array/fields/any/none so local uploads expose `file.location` like S3. Local storage in non-production or missing/dummy bucket configuration; production configured S3 via AWS SDK v3 + multer-s3. Relative /uploads/{images,videos,pdfs}/filename served by Express; remote locations may be absolute URLs.
- Allowlisted MIME AND extension for image/video/PDF; per-file max 50 MB, field max 10 MB. Do not add arbitrary executables or HTML uploads. Current validation is metadata-based, not content sniffing. Check `utils/s3.js` and relevant controller for deletion behavior and ownership of stored objects.
- Multipart field names: news media (array), ads bannerImage, profile profileImage, settings appLogo/appIcon/defaultNewsImage/defaultShareImage. Preserve existing URLs and clients. Test local and mocked cloud paths; do not delete actual objects.

## External services
- AWS config uses AWS_REGION/AWS_S3_BUCKET and optional AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY. SMTP uses SMTP_HOST/PORT/SECURE/USER/PASS and EMAIL_FROM; email links use FRONTEND_URL. Firebase uses FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY (escaped newlines normalized). Expo optional EXPO_PUSH_ACCESS_TOKEN. Only document variable names, never values.
- Missing secrets in archive intentional; no live provider verification. Keep credentials server-only and avoid logging tokens, raw prompts or secrets.

## AI endpoints (currently placeholders, NOT real model calls)
- `src/routes/aiRoutes.js` + `src/controllers/aiController.js`: POST /api/ai/generate and /rewrite-headline, all three admin roles, AI rate limiter and bot protection.
- Generate accepts `{prompt,context,targetLength=60}`; prompt nonempty string <=2000 chars. Returns `data:{prompt,generatedText,wordCount,timestamp}`. Currently deterministic template based on prompt slice, context not used.
- Rewrite accepts `{headline,style='engaging'}` -> `data:{original,rewritten,style}`; current result is style prefix plus headline. No actual Gemini/OpenAI integration or model dependency in package.json.
- If asked to implement real AI, keep API shape where possible, configure provider server-side, validate input and output, apply timeouts and rate limits, avoid logging user content, handle provider errors, and require editorial review before publishing. Do not make AI publish or send notifications automatically unless requested.
