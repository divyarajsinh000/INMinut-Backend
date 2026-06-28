const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/avif", "image/heic", "image/heif",
]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v",
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

const storage = multerS3({
  s3,
  bucket: BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  // No ACL here — your bucket uses "Bucket owner enforced" ownership,
  // and the bucket policy already grants public read on all objects.
  key: (req, file, cb) => {
    const uploadType = getUploadType(file) || "images";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || "");
    cb(null, `${uploadType}/${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024, fieldSize: 10 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;