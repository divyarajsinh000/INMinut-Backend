const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
const folders = ["images", "videos", "pdfs"];

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
folders.forEach((folder) => {
  const folderPath = path.join(uploadDir, folder);
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
});

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-m4v",
]);

const PDF_MIME_TYPES = new Set(["application/pdf"]);

const IMAGE_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".gif", ".webp", ".avif", ".heic", ".heif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

const getUploadType = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = file.mimetype;

  if (IMAGE_MIME_TYPES.has(mime) && IMAGE_EXTENSIONS.has(ext)) return "images";
  if (VIDEO_MIME_TYPES.has(mime) && VIDEO_EXTENSIONS.has(ext)) return "videos";
  if (PDF_MIME_TYPES.has(mime) && PDF_EXTENSIONS.has(ext)) return "pdfs";

  return null;
};

const fileFilter = (req, file, cb) => {
  if (getUploadType(file)) return cb(null, true);
  return cb(
    new Error(
      "Only image files (jpg, jpeg, png, gif, webp, avif, heic), videos (mp4, webm, ogg, mov, m4v), and PDFs are allowed."
    )
  );
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = getUploadType(file) || "images";
    cb(null, path.join(uploadDir, uploadType));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname || "")}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;
