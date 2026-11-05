import validator from "validator";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { requireFields } from "../utils/helpers.js";
import { signToken } from "../utils/token.js";

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  city: u.city,
  avatar: u.avatar,
  role: u.role,
  watchlist: u.watchlist,
  createdAt: u.createdAt,
});

// POST /api/auth/register
export async function register(req, res) {
  requireFields(req.body, ["name", "email", "password"]);
  const { name, email, password, phone = "", city = "" } = req.body;
  if (!validator.isEmail(String(email))) throw new AppError("Please enter a valid email address", 400);
  if (String(password).length < 6) throw new AppError("Password must be at least 6 characters", 400);

  const exists = await User.exists({ email: String(email).toLowerCase().trim() });
  if (exists) throw new AppError("An account with this email already exists", 409);

  // role is never taken from the request body: public sign-ups are always regular users.
  const user = await User.create({ name, email, password, phone, city });
  res.status(201).json({ success: true, message: "Account created", token: signToken(user), user: publicUser(user) });
}

// POST /api/auth/login   (body.adminOnly=true is used by the admin panel)
export async function login(req, res) {
  requireFields(req.body, ["email", "password"]);
  const { email, password, adminOnly } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
  if (!user || !(await user.comparePassword(String(password)))) throw new AppError("Invalid email or password", 401);
  if (user.isBlocked) throw new AppError("Your account has been blocked. Please contact support.", 403);
  if (adminOnly && user.role !== "admin") throw new AppError("This account does not have admin access", 403);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: "Logged in", token: signToken(user), user: publicUser(user) });
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}

// PUT /api/auth/me
export async function updateProfile(req, res) {
  const allowed = ["name", "phone", "city", "avatar"];
  for (const k of allowed) if (req.body[k] !== undefined) req.user[k] = req.body[k];
  await req.user.save();
  res.json({ success: true, message: "Profile updated", user: publicUser(req.user) });
}

// PUT /api/auth/password
export async function changePassword(req, res) {
  requireFields(req.body, ["currentPassword", "newPassword"]);
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(String(req.body.currentPassword)))) throw new AppError("Current password is incorrect", 400);
  if (String(req.body.newPassword).length < 6) throw new AppError("New password must be at least 6 characters", 400);
  user.password = req.body.newPassword;
  await user.save();
  res.json({ success: true, message: "Password changed", token: signToken(user) });
}
