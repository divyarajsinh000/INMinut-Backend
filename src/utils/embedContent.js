const { sanitizeString } = require("./sanitizer");
const approvedScripts = new Set([
  "https://cdorgapi.b-cdn.net/widgets/score.js",
  "https://cdorgapi.b-cdn.net/widgets/matchlist.js",
  "https://cdorgapi.b-cdn.net/widgets/vmatchlist.js",
  "https://www.instagram.com/embed.js",
  "https://platform.instagram.com/en_US/embeds.js",
]);

function normalizeEmbedUrl(value) {
  let url;
  try { url = new URL(value.startsWith("//") ? `https:${value}` : value); } catch { return ""; }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"].includes(host)) {
    const id = host === "youtu.be" ? parts[0] : parts[0] === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live", "v"].includes(parts[0]) ? parts[1] : null;
    if (/^[A-Za-z0-9_-]{11}$/.test(id || "")) return `https://www.youtube.com/embed/${id}${parts[0] === "embed" ? url.search : ""}`;
  }
  if (["instagram.com", "www.instagram.com", "m.instagram.com"].includes(host) && ["p", "reel", "reels", "tv"].includes(parts[0]) && /^[A-Za-z0-9_-]+$/.test(parts[1] || "")) {
    return `https://www.instagram.com/${parts[0] === "reels" ? "reel" : parts[0]}/${parts[1]}/embed/`;
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = parts[0] === "video" ? parts[1] : parts[0];
    if (/^\d+$/.test(id || "")) return `https://player.vimeo.com/video/${id}${url.search}`;
  }
  return url.href;
}

function prepareEmbedCode(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Embed code is required");
  const code = value.trim();
  if (!code.startsWith("<")) {
    const url = normalizeEmbedUrl(code);
    if (!url) throw new Error("Enter a valid HTTP(S) URL or embed HTML");
    return url;
  }
  // Allow only explicitly reviewed external scripts, never arbitrary inline JS.
  // Other HTML is subject to the existing sanitizer and must render in isolation.
  const scripts = [];
  const marker = `INMINUT_SCRIPT_${require("crypto").randomBytes(12).toString("hex")}_`;
  const protectedCode = code.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (_, attrs, body) => {
    const match = attrs.match(/(?:^|\s)src\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const raw = match?.[1] || match?.[2] || match?.[3] || "";
    const src = raw.startsWith("//") ? `https:${raw}` : raw;
    if (body.trim() || !approvedScripts.has(src)) throw new Error("Unsupported script widget. Use an HTTPS iframe or an approved widget script.");
    const index = scripts.push(`<script src="${src}"></script>`) - 1;
    return `${marker}${index}_END`;
  });
  if (/<\/?script\b/i.test(protectedCode)) throw new Error("Invalid script widget");
  const clean = sanitizeString(protectedCode).replace(new RegExp(`${marker}(\\d+)_END`, "g"), (_, index) => scripts[Number(index)]);
  if (!clean.trim()) throw new Error("Embed code is empty after validation");
  return clean;
}
module.exports = { normalizeEmbedUrl, prepareEmbedCode };
