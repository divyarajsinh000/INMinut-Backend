const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;

const isS3Url = (url) => /^https?:\/\//i.test(url || "");

const getKeyFromUrl = (url) => {
    try {
        const parsed = new URL(url);
        return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    } catch (e) {
        return null;
    }
};

const deleteFromS3 = async (url) => {
    if (!isS3Url(url)) return; // old local-disk path, nothing to do in S3
    const key = getKeyFromUrl(url);
    if (!key) return;
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (err) {
        console.error("S3 delete error:", err.message);
    }
};

module.exports = { deleteFromS3, isS3Url };