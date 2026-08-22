const mongoose = require("mongoose");
const path = require("path");

/**
 * Escapes special regular expression characters in a user-supplied string
 * to prevent Regex Injection and Regular Expression Denial of Service (ReDoS) in MongoDB queries.
 */
const escapeRegExp = (string) => {
  if (typeof string !== "string") return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Validates whether a given string is a valid 24-character hexadecimal MongoDB ObjectId.
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  if (id.length !== 24) return false;
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitizes input strings against Script Injection (XSS), inline handlers, and dangerous URIs.
 */
const sanitizeString = (val) => {
  if (val === null || val === undefined) return val;
  if (typeof val !== "string") return val;

  let cleaned = val.trim();

  // Strip script tags and content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Strip inline HTML event handlers like onload, onerror, onclick, etc.
  cleaned = cleaned.replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // Strip dangerous URL schemes embedded in attributes or tags
  cleaned = cleaned.replace(/javascript\s*:/gi, "javascript_blocked:");
  cleaned = cleaned.replace(/vbscript\s*:/gi, "vbscript_blocked:");
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, "data_blocked:");

  return cleaned;
};

/**
 * Validates and normalizes web URLs, enforcing http or https protocol.
 */
const sanitizeUrl = (url) => {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();

  // Block dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return "";
  }

  // Auto-prefix protocol if missing relative to http/https
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If it starts with domain or path without protocol
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
};

/**
 * Sanitizes uploaded file names to prevent path traversal, null bytes, double extensions, and shell characters.
 */
const sanitizeFilename = (filename = "") => {
  if (typeof filename !== "string" || !filename) return "file";

  // 1. Remove path traversal sequences & null bytes
  let safeName = filename.replace(/\0/g, "").replace(/(\.\.[\/\\])+/g, "");

  // Extract base filename without path
  safeName = path.basename(safeName);

  // 2. Extract extension and stem
  const ext = path.extname(safeName).toLowerCase();
  const stem = path.basename(safeName, ext);

  // 3. Clean stem: remove non-alphanumeric except hyphen, underscore, and space
  const cleanStem = stem
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 100);

  // 4. Clean extension: only allow alphanumeric extension
  const cleanExt = ext.replace(/[^a-z0-9]/g, "");

  return cleanExt ? `${cleanStem}.${cleanExt}` : cleanStem;
};

/**
 * Recursively sanitizes request payload objects (strings in objects and arrays).
 */
const sanitizePayload = (data) => {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item));
  }

  if (typeof data === "object" && data.constructor === Object) {
    const sanitized = {};
    for (const key of Object.keys(data)) {
      // Prevent prototype pollution or operator keys starting with $ or containing .
      if (key.startsWith("$") || key.includes(".")) continue;
      sanitized[key] = sanitizePayload(data[key]);
    }
    return sanitized;
  }

  return data;
};

module.exports = {
  escapeRegExp,
  isValidObjectId,
  sanitizeString,
  sanitizeUrl,
  sanitizeFilename,
  sanitizePayload,
};
