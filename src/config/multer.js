const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { sanitizeFilename } = require("../utils/sanitizer");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;
const isDummyS3 = BUCKET === "dummy-bucket";

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

const IMAGE_EXTENSIONS = new Set([
  ".jpeg",
  ".jpg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

const DANGEROUS_EXTENSIONS = new Set([
  ".php",
  ".php3",
  ".php4",
  ".php5",
  ".phtml",
  ".exe",
  ".bat",
  ".sh",
  ".cmd",
  ".js",
  ".html",
  ".htm",
  ".svg",
  ".jar",
  ".vbs",
  ".cgi",
  ".pl",
  ".py",
]);

/**
 * Checks if the filename contains dangerous secondary extensions (e.g. file.php.png).
 */
const hasDangerousExtension = (filename = "") => {
  const parts = filename.toLowerCase().split(".");
  if (parts.length <= 2) return false;
  for (let i = 1; i < parts.length - 1; i++) {
    if (DANGEROUS_EXTENSIONS.has(`.${parts[i]}`)) {
      return true;
    }
  }
  return false;
};

const getUploadType = (file) => {
  if (!file) return null;
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (hasDangerousExtension(file.originalname)) {
    return null;
  }

  if (IMAGE_MIME_TYPES.has(mime) && IMAGE_EXTENSIONS.has(ext)) return "images";
  if (VIDEO_MIME_TYPES.has(mime) && VIDEO_EXTENSIONS.has(ext)) return "videos";
  if (PDF_MIME_TYPES.has(mime) && PDF_EXTENSIONS.has(ext)) return "pdfs";

  return null;
};

const fileFilter = (req, file, cb) => {
  const type = getUploadType(file);
  if (type) {
    return cb(null, true);
  }

  const err = new Error(
    "Invalid file upload. Only image files (jpg, jpeg, png, gif, webp, avif, heic), videos (mp4, webm, ogg, mov, m4v), and PDFs are allowed. Executable scripts and double extensions are strictly rejected."
  );
  err.status = 400;
  return cb(err);
};

const storage = isDummyS3
  ? multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadType = getUploadType(file) || "images";
        const typeDir = path.join(__dirname, "../../uploads", uploadType);
        if (!fs.existsSync(typeDir)) {
          fs.mkdirSync(typeDir, { recursive: true });
        }
        cb(null, typeDir);
      },
      filename: (req, file, cb) => {
        const cleanName = sanitizeFilename(file.originalname || "upload");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(cleanName);
        const nameWithoutExt = path.basename(cleanName, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
      },
    })
  : multerS3({
      s3,
      bucket: BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const uploadType = getUploadType(file) || "images";
        const cleanName = sanitizeFilename(file.originalname || "upload");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(cleanName);
        const nameWithoutExt = path.basename(cleanName, ext);
        cb(null, `${uploadType}/${nameWithoutExt}-${uniqueSuffix}${ext}`);
      },
    });

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 10 * 1024 * 1024 },
  fileFilter,
});

const wrapUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        err.status = 400;
        if (err.code === "LIMIT_FILE_SIZE") {
          err.message = "File size limit exceeded (max 50MB)";
        }
      }
      return res.status(err.status || 400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    if (isDummyS3) {
      const processFile = (file) => {
        if (!file.location && file.filename) {
          const uploadType = getUploadType(file) || "images";
          file.location = `/uploads/${uploadType}/${file.filename}`;
        }
      };
      if (req.file) processFile(req.file);
      if (req.files) {
        if (Array.isArray(req.files)) {
          req.files.forEach(processFile);
        } else {
          Object.values(req.files).forEach((fileArray) => {
            fileArray.forEach(processFile);
          });
        }
      }
    }
    next();
  });
};

module.exports = {
  array: (name, maxCount) => wrapUpload(upload.array(name, maxCount)),
  single: (name) => wrapUpload(upload.single(name)),
  fields: (fields) => wrapUpload(upload.fields(fields)),
};