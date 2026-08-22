const express = require("express");
const { generateContent, rewriteHeadline } = require("../controllers/aiController");
const { auth, authorize } = require("../middlewares/auth");
const { aiGenerationLimiter } = require("../middlewares/security");
const { botProtection } = require("../middlewares/botProtection");

const router = express.Router();

// Apply AI rate limiting and bot protection to all AI generation routes
router.use(botProtection);
router.use(aiGenerationLimiter);

router.post("/generate", auth, authorize("super-admin", "editor", "reporter"), generateContent);
router.post("/rewrite-headline", auth, authorize("super-admin", "editor", "reporter"), rewriteHeadline);

module.exports = router;
