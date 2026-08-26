const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");

const BUCKET = process.env.AWS_S3_BUCKET;
const AWS_REGION = process.env.AWS_REGION;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Use local disk storage when running locally or whenever S3 is not configured.
// In production, AWS_S3_BUCKET and AWS_REGION must be present.
const USE_LOCAL_STORAGE =
  !IS_PRODUCTION ||
  !BUCKET ||
  !AWS_REGION ||
  BUCKET === "dummy-bucket";

if (IS_PRODUCTION && USE_LOCAL_STORAGE) {
  console.warn(
    "[multer] S3 is not fully configured. Falling back to local upload storage."
  );
}

const s3 = USE_LOCAL_STORAGE
  ? null
  : new S3Client({
      region: AWS_REGION,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
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

const getUploadType = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = file.mimetype;

  if (IMAGE_MIME_TYPES.has(mime) && IMAGE_EXTENSIONS.has(ext)) {
    return "images";
  }

  if (VIDEO_MIME_TYPES.has(mime) && VIDEO_EXTENSIONS.has(ext)) {
    return "videos";
  }

  if (PDF_MIME_TYPES.has(mime) && PDF_EXTENSIONS.has(ext)) {
    return "pdfs";
  }

  return null;
};

const fileFilter = (req, file, cb) => {
  if (getUploadType(file)) {
    return cb(null, true);
  }

  return cb(
    new Error(
      "Only image files (jpg, jpeg, png, gif, webp, avif, heic), videos (mp4, webm, ogg, mov, m4v), and PDFs are allowed."
    )
  );
};

const createUniqueFileName = (file) => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname || "").toLowerCase();
  return `${uniqueSuffix}${ext}`;
};

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadType = getUploadType(file) || "images";
      const typeDir = path.join(__dirname, "../../uploads", uploadType);

      fs.mkdirSync(typeDir, { recursive: true });
      cb(null, typeDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, createUniqueFileName(file));
  },
});

const s3Storage = USE_LOCAL_STORAGE
  ? null
  : multerS3({
      s3,
      bucket: BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const uploadType = getUploadType(file) || "images";
        cb(null, `${uploadType}/${createUniqueFileName(file)}`);
      },
    });

const upload = multer({
  storage: USE_LOCAL_STORAGE ? localStorage : s3Storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    fieldSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

const addLocalFileLocation = (file) => {
  if (!file || file.location || !file.filename) {
    return;
  }

  const uploadType = getUploadType(file) || "images";
  file.location = `/uploads/${uploadType}/${file.filename}`;
};

const wrapUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (USE_LOCAL_STORAGE) {
      addLocalFileLocation(req.file);

      if (Array.isArray(req.files)) {
        req.files.forEach(addLocalFileLocation);
      } else if (req.files && typeof req.files === "object") {
        Object.values(req.files).forEach((files) => {
          if (Array.isArray(files)) {
            files.forEach(addLocalFileLocation);
          }
        });
      }
    }

    return next();
  });
};

// Keep the same API for routes in both local and production environments.
module.exports = {
  array: (name, maxCount) => wrapUpload(upload.array(name, maxCount)),
  single: (name) => wrapUpload(upload.single(name)),
  fields: (fields) => wrapUpload(upload.fields(fields)),
  any: () => wrapUpload(upload.any()),
  none: () => wrapUpload(upload.none()),
};
