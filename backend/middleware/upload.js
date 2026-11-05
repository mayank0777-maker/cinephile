import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import AppError from "../utils/AppError.js";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new AppError("Only image files (jpg, png, webp, gif, avif) are allowed", 400)),
});

// Deletes a previously uploaded file referenced as "/uploads/<name>". External URLs are ignored.
export function removeUpload(ref) {
  if (!ref || typeof ref !== "string" || !ref.startsWith("/uploads/")) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(ref)), () => {});
}
