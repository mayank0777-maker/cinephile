import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import Review from "../models/Review.js";
import AppError from "../utils/AppError.js";
import { assertObjectId, paginate } from "../utils/helpers.js";

// GET /api/movies/:movieId/reviews
export async function listReviews(req, res) {
  assertObjectId(req.params.movieId, "movie id");
  const { page, limit, skip } = paginate({ ...req.query, limit: req.query.limit || 10 });
  const filter = { movie: req.params.movieId };
  const [items, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "name avatar"),
    Review.countDocuments(filter),
  ]);
  const mine = req.user ? await Review.findOne({ movie: req.params.movieId, user: req.user._id }) : null;
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1, mine });
}

// POST /api/movies/:movieId/reviews  { rating (1-10), comment } — creates or updates your review
export async function upsertReview(req, res) {
  assertObjectId(req.params.movieId, "movie id");
  const movie = await Movie.findById(req.params.movieId);
  if (!movie) throw new AppError("Movie not found", 404);
  if (movie.status === "upcoming") throw new AppError("You can review a movie once it has released", 400);
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) throw new AppError("Rating must be a whole number from 1 to 10", 400);

  const review = await Review.findOneAndUpdate(
    { movie: movie._id, user: req.user._id },
    { rating, comment: String(req.body.comment || "").trim() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).populate("user", "name avatar");
  await Review.recalculate(movie._id);
  const watched = await Booking.exists({ user: req.user._id, movie: movie._id, status: "confirmed" });
  res.status(201).json({ success: true, message: "Thanks for your review!", review, verifiedViewer: Boolean(watched) });
}

// DELETE /api/reviews/:id — owner or admin
export async function deleteReview(req, res) {
  assertObjectId(req.params.id, "review id");
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError("Review not found", 404);
  if (req.user.role !== "admin" && String(review.user) !== String(req.user._id)) throw new AppError("You can only delete your own review", 403);
  await review.deleteOne();
  await Review.recalculate(review.movie);
  res.json({ success: true, message: "Review deleted" });
}
