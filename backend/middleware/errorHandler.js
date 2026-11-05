import multer from "multer";
import { env } from "../config/env.js";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express 5 forwards errors thrown in async handlers here automatically.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || "Something went wrong";
  let details = err.details;

  if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.name === "ValidationError") {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    message = Object.values(details)[0] || "Validation failed";
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `A record with this ${field} already exists`;
  } else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid session, please log in again";
  } else if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Session expired, please log in again";
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5 MB)" : err.message;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Malformed JSON body";
  }

  if (status >= 500) console.error("[error]", req.method, req.originalUrl, err);

  res.status(status).json({
    success: false,
    message: status >= 500 && env.NODE_ENV === "production" ? "Internal server error" : message,
    ...(details ? { details } : {}),
  });
}
