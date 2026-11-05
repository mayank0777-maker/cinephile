import crypto from "crypto";
import AppError from "./AppError.js";

export const isObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v || ""));

export function assertObjectId(v, label = "id") {
  if (!isObjectId(v)) throw new AppError(`Invalid ${label}`, 400);
}

export function requireFields(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body?.[f] === null || String(body[f]).trim() === "");
  if (missing.length) throw new AppError(`Missing required field(s): ${missing.join(", ")}`, 400, { missing });
}

// Accepts arrays, JSON strings ('["a","b"]') or comma separated strings ("a, b") — handy for multipart forms.
export function toArray(v) {
  if (v === undefined || v === null || v === "") return [];
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x.trim() : x)).filter((x) => x !== "");
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("[")) {
      try {
        return toArray(JSON.parse(s));
      } catch {
        /* fall through to comma split */
      }
    }
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return [v];
}

export function parseJSON(v, fallback) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Human friendly, hard to guess booking reference, e.g. CNP-7K2M9QX4
export function generateBookingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `CNP-${out}`;
}

export function paginate(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
