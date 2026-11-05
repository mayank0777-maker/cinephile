import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { assertObjectId, escapeRegex, paginate } from "../utils/helpers.js";

/* ------------------------------ watchlist ------------------------------ */

// GET /api/users/watchlist
export async function getWatchlist(req, res) {
  const user = await User.findById(req.user._id).populate({ path: "watchlist", select: "-cast -crew" });
  res.json({ success: true, items: user.watchlist.filter(Boolean) });
}

// POST /api/users/watchlist/:movieId
export async function addToWatchlist(req, res) {
  assertObjectId(req.params.movieId, "movie id");
  if (!(await Movie.exists({ _id: req.params.movieId }))) throw new AppError("Movie not found", 404);
  await User.updateOne({ _id: req.user._id }, { $addToSet: { watchlist: req.params.movieId } });
  res.json({ success: true, message: "Added to your watchlist", inWatchlist: true });
}

// DELETE /api/users/watchlist/:movieId
export async function removeFromWatchlist(req, res) {
  assertObjectId(req.params.movieId, "movie id");
  await User.updateOne({ _id: req.user._id }, { $pull: { watchlist: req.params.movieId } });
  res.json({ success: true, message: "Removed from your watchlist", inWatchlist: false });
}

/* ------------------------------ admin: users ------------------------------ */

// GET /api/users?search=&role=&page=&limit=   (admin)
export async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const { page, limit, skip } = paginate(req.query);
  const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), User.countDocuments(filter)]);
  const counts = await Booking.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: "confirmed" } },
    { $group: { _id: "$user", bookings: { $sum: 1 }, spent: { $sum: "$totalAmount" } } },
  ]);
  const byUser = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  const items = users.map(({ password, ...u }) => ({ ...u, bookings: byUser[String(u._id)]?.bookings || 0, spent: byUser[String(u._id)]?.spent || 0 })); // eslint-disable-line no-unused-vars
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
}

// PATCH /api/users/:id  { role?, isBlocked? }   (admin)
export async function updateUser(req, res) {
  assertObjectId(req.params.id, "user id");
  if (String(req.params.id) === String(req.user._id)) throw new AppError("You cannot change your own role or block yourself", 400);
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  if (req.body.role !== undefined) {
    if (!["user", "admin"].includes(req.body.role)) throw new AppError("Invalid role", 400);
    user.role = req.body.role;
  }
  if (req.body.isBlocked !== undefined) user.isBlocked = Boolean(req.body.isBlocked);
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: "User updated", user });
}

// DELETE /api/users/:id   (admin)
export async function deleteUser(req, res) {
  assertObjectId(req.params.id, "user id");
  if (String(req.params.id) === String(req.user._id)) throw new AppError("You cannot delete your own account here", 400);
  const active = await Booking.countDocuments({ user: req.params.id, status: "confirmed", "snapshot.startTime": { $gt: new Date() } });
  if (active) throw new AppError(`User has ${active} upcoming confirmed booking(s). Block the account instead.`, 409);
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ success: true, message: "User deleted" });
}
