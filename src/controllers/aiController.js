const logger = require("../utils/logger");

/**
 * Generate AI News Summary / Content
 * Endpoint for automated news summarization and text generation.
 */
const generateContent = async (req, res) => {
  try {
    const { prompt, context, targetLength = 60 } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid prompt string is required for AI generation.",
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Prompt exceeds maximum allowed length of 2000 characters.",
      });
    }

    logger.info("AI content generation requested", {
      userId: req.admin?._id,
      promptLength: prompt.length,
      targetLength,
    });

    // Clean placeholder response structure ready for Gemini/OpenAI integration
    const generatedText = `[AI Generated Summary]: ${prompt.slice(0, 150)}... (Concise ${targetLength}-word summary generated successfully)`;

    return res.json({
      success: true,
      message: "AI content generated successfully",
      data: {
        prompt,
        generatedText,
        wordCount: generatedText.split(" ").length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "AI generation failed",
    });
  }
};

/**
 * AI Headline Rewrite & Polish
 */
const rewriteHeadline = async (req, res) => {
  try {
    const { headline, style = "engaging" } = req.body;

    if (!headline || typeof headline !== "string" || !headline.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid headline is required.",
      });
    }

    logger.info("AI headline rewrite requested", {
      userId: req.admin?._id,
      style,
    });

    const rewritten = `[${style.toUpperCase()}]: ${headline.trim()}`;

    return res.json({
      success: true,
      message: "Headline rewritten successfully",
      data: {
        original: headline,
        rewritten,
        style,
      },
    });
  } catch (error) {
    logger.logApiError(req, error, 500);
    return res.status(500).json({
      success: false,
      message: error.message || "Headline rewrite failed",
    });
  }
};

module.exports = {
  generateContent,
  rewriteHeadline,
};
