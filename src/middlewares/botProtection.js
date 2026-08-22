const logger = require("../utils/logger");

// List of known automated scraper / scanner User-Agent patterns
const SUSPICIOUS_USER_AGENTS = [
  /curl/i,
  /python-requests/i,
  /python-urllib/i,
  /scrapy/i,
  /libwww-perl/i,
  /go-http-client/i,
  /httpclient/i,
  /phantomjs/i,
  /puppeteer/i,
  /selenium/i,
  /headlesschrome/i,
  /zgrab/i,
  /nmap/i,
  /masscan/i,
  /nikto/i,
  /sqlmap/i,
  /wget/i,
  /httpx/i,
  /gobuster/i,
  /dirbuster/i,
];

/**
 * Anti-Bot & Scraper Protection Middleware
 * Blocks automated scrapers and malicious scanning tools.
 */
const botProtection = (req, res, next) => {
  const userAgent = req.get("user-agent") || "";

  // Always set anti-scraping and indexing control headers
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Allow authenticated admin / system calls even if headers differ
  const hasAuthHeader = Boolean(req.get("authorization"));

  if (!hasAuthHeader && userAgent) {
    const isSuspicious = SUSPICIOUS_USER_AGENTS.some((pattern) =>
      pattern.test(userAgent)
    );

    if (isSuspicious) {
      logger.logSecurityEvent(
        req,
        "BOT_ACCESS_BLOCKED",
        `Blocked automated bot/scraper request with User-Agent: ${userAgent}`,
        { userAgent, path: req.originalUrl }
      );

      return res.status(403).json({
        success: false,
        message: "Automated access or bot request detected. Access forbidden.",
      });
    }
  }

  // Check for completely missing user-agent on POST/PUT mutation endpoints
  if (!hasAuthHeader && !userAgent && ["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    logger.logSecurityEvent(
      req,
      "SUSPICIOUS_EMPTY_USER_AGENT",
      `Blocked mutation request with empty User-Agent on ${req.method} ${req.originalUrl}`,
      { path: req.originalUrl, method: req.method }
    );

    return res.status(400).json({
      success: false,
      message: "Bad request. Missing required client identification header.",
    });
  }

  next();
};

/**
 * Honeypot Trap Route Handler
 * Immediately logs vulnerability scanners attempting to access bait paths.
 */
const honeypotTrap = (req, res) => {
  const userAgent = req.get("user-agent") || "unknown";

  logger.logSecurityEvent(
    req,
    "HONEYPOT_TRAP_TRIGGERED",
    `Automated scanner triggered honeypot route: ${req.originalUrl}`,
    { path: req.originalUrl, method: req.method, userAgent }
  );

  return res.status(404).json({
    success: false,
    message: "Cannot GET " + req.originalUrl,
  });
};

module.exports = {
  botProtection,
  honeypotTrap,
};
