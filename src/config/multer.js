const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;
const isDummyS3 = BUCKET === 'dummy-bucket';

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

const storage = isDummyS3 ? multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = getUploadType(file) || "images";
    const typeDir = path.join(__dirname, "../../uploads", uploadType);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || "");
    cb(null, `${uniqueSuffix}${ext}`);
  }
}) : multerS3({
  s3,
  bucket: BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
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

const wrapUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) return next(err);
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

module.exports = isDummyS3 ? {
  array: (name, maxCount) => wrapUpload(upload.array(name, maxCount)),
  single: (name) => wrapUpload(upload.single(name)),
  fields: (fields) => wrapUpload(upload.fields(fields)),
} : upload;