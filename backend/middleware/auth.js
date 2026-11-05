import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { verifyToken } from "../utils/token.js";

function readToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

async function loadUser(token) {
  const payload = verifyToken(token); // throws on invalid / expired token
  const user = await User.findById(payload.id);
  if (!user) throw new AppError("Account no longer exists", 401);
  if (user.isBlocked) throw new AppError("Your account has been blocked. Please contact support.", 403);
  return user;
}

// Requires a valid JWT in "Authorization: Bearer <token>". Attaches req.user.
export async function protect(req, _res, next) {
  const token = readToken(req);
  if (!token) throw new AppError("Please log in to continue", 401);
  req.user = await loadUser(token);
  next();
}

// Attaches req.user when a valid token is present, otherwise continues anonymously.
export async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = await loadUser(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

// Role-based authorisation. Use after protect.
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw new AppError("You do not have permission to do this", 403);
    next();
  };

export const adminOnly = authorize("admin");
