import Booking from "../models/Booking.js";
import Movie, { MOVIE_STATUSES } from "../models/Movie.js";
import Review from "../models/Review.js";
import Show from "../models/Show.js";
import { removeUpload } from "../middleware/upload.js";
import AppError from "../utils/AppError.js";
import { escapeRegex, isObjectId, paginate, parseJSON, toArray } from "../utils/helpers.js";

const SORTS = {
  latest: { releaseDate: -1 },
  oldest: { releaseDate: 1 },
  rating: { rating: -1 },
  title: { title: 1 },
  popular: { isPopular: -1, "userRating.count": -1, rating: -1 },
};

// GET /api/movies?status=&genre=&language=&search=&trending=&popular=&sort=&page=&limit=
export async function listMovies(req, res) {
  const { status, genre, language, search, trending, popular, sort = "latest" } = req.query;
  const filter = {};
  if (status && MOVIE_STATUSES.includes(status)) filter.status = status;
  else if (!req.user || req.user.role !== "admin" || req.query.all !== "true") filter.status = { $ne: "ended" };
  if (genre) filter.genres = { $in: toArray(genre) };
  if (language) filter.languages = { $in: toArray(language) };
  if (trending === "true") filter.isTrending = true;
  if (popular === "true") filter.isPopular = true;
  if (search && String(search).trim()) {
    const rx = new RegExp(escapeRegex(String(search).trim()), "i");
    filter.$or = [{ title: rx }, { genres: rx }, { "cast.name": rx }, { languages: rx }];
  }

  const { page, limit, skip } = paginate(req.query);
  const [items, total] = await Promise.all([
    Movie.find(filter).sort(SORTS[sort] || SORTS.latest).skip(skip).limit(limit).select("-cast -crew"),
    Movie.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
}

// GET /api/movies/filters -> genres & languages available for the filter bar
export async function getFilters(_req, res) {
  const [genres, languages] = await Promise.all([
    Movie.distinct("genres", { status: { $ne: "ended" } }),
    Movie.distinct("languages", { status: { $ne: "ended" } }),
  ]);
  res.json({ success: true, genres: genres.sort(), languages: languages.sort() });
}

// GET /api/movies/:idOrSlug
export async function getMovie(req, res) {
  const { idOrSlug } = req.params;
  const movie = await Movie.findOne(isObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug });
  if (!movie) throw new AppError("Movie not found", 404);
  const inWatchlist = req.user ? req.user.watchlist.some((id) => String(id) === String(movie._id)) : false;
  res.json({ success: true, movie, inWatchlist });
}

function buildMovieData(body, files) {
  const data = {};
  const text = ["title", "tagline", "description", "certificate", "status", "trailerUrl"];
  for (const k of text) if (body[k] !== undefined) data[k] = String(body[k]).trim();
  for (const k of ["genres", "languages", "formats"]) if (body[k] !== undefined) data[k] = toArray(body[k]);
  for (const k of ["duration", "rating"]) if (body[k] !== undefined && body[k] !== "") data[k] = Number(body[k]);
  if (body.releaseDate) data.releaseDate = new Date(body.releaseDate);
  for (const k of ["isTrending", "isPopular"]) if (body[k] !== undefined) data[k] = body[k] === true || body[k] === "true";
  for (const k of ["cast", "crew"]) {
    if (body[k] !== undefined) {
      data[k] = (parseJSON(body[k], []) || [])
        .filter((p) => p && String(p.name || "").trim())
        .map((p) => ({ name: String(p.name).trim(), role: String(p.role || "").trim(), image: String(p.image || "").trim() }));
    }
  }
  // Uploaded files win over URL fields.
  if (files?.poster?.[0]) data.poster = `/uploads/${files.poster[0].filename}`;
  else if (body.posterUrl) data.poster = String(body.posterUrl).trim();
  if (files?.backdrop?.[0]) data.backdrop = `/uploads/${files.backdrop[0].filename}`;
  else if (body.backdropUrl !== undefined) data.backdrop = String(body.backdropUrl).trim();
  return data;
}

// POST /api/movies (admin, multipart: poster, backdrop files optional)
export async function createMovie(req, res) {
  const movie = await Movie.create(buildMovieData(req.body, req.files));
  res.status(201).json({ success: true, message: "Movie added", movie });
}

// PUT /api/movies/:id (admin)
export async function updateMovie(req, res) {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new AppError("Movie not found", 404);
  const data = buildMovieData(req.body, req.files);
  const oldPoster = movie.poster;
  const oldBackdrop = movie.backdrop;
  movie.set(data);
  await movie.save();
  if (data.poster && data.poster !== oldPoster) removeUpload(oldPoster);
  if (data.backdrop !== undefined && data.backdrop !== oldBackdrop) removeUpload(oldBackdrop);
  res.json({ success: true, message: "Movie updated", movie });
}

// DELETE /api/movies/:id (admin) — refused while confirmed bookings exist for upcoming shows.
export async function deleteMovie(req, res) {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new AppError("Movie not found", 404);
  const upcomingShowIds = await Show.find({ movie: movie._id, startTime: { $gt: new Date() } }).distinct("_id");
  const active = await Booking.countDocuments({ show: { $in: upcomingShowIds }, status: { $in: ["confirmed", "pending"] } });
  if (active) throw new AppError(`Cannot delete: ${active} active booking(s) exist for upcoming shows. Mark the movie as "ended" or cancel those shows first.`, 409);

  await Show.deleteMany({ movie: movie._id, startTime: { $gt: new Date() } });
  await Review.deleteMany({ movie: movie._id });
  await movie.deleteOne();
  removeUpload(movie.poster);
  removeUpload(movie.backdrop);
  res.json({ success: true, message: "Movie deleted" });
}
