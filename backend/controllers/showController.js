import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import AppError from "../utils/AppError.js";
import { assertObjectId, escapeRegex, isObjectId, paginate, requireFields, toArray } from "../utils/helpers.js";
import { refundBookingPayment } from "./paymentController.js";
import { purgeExpiredLocks, seatStatusForViewer } from "../utils/seatService.js";

const CLEANING_BUFFER_MIN = 20;

function summarise(show) {
  const s = show.toObject ? show.toObject({ virtuals: true }) : show;
  const total = (s.layout?.categories || []).reduce((n, c) => n + c.rows.length, 0) * (s.layout?.seatsPerRow || 0);
  const t = Date.now();
  const held = (s.seatLocks || []).filter((l) => new Date(l.expiresAt).getTime() > t).length;
  const available = Math.max(0, total - (s.bookedSeats?.length || 0) - held);
  const prices = (s.layout?.categories || []).map((c) => c.price);
  const { seatLocks, bookedSeats, ...rest } = s; // eslint-disable-line no-unused-vars
  return { ...rest, totalSeats: total, availableSeats: available, minPrice: Math.min(...prices), maxPrice: Math.max(...prices) };
}

// GET /api/shows?movie=&theatre=&city=&from=&to=&includePast=
// Public: lists bookable shows. Admins can pass includePast=true and paginate.
export async function listShows(req, res) {
  const { movie, theatre, city, from, to } = req.query;
  const isAdmin = req.user?.role === "admin";
  const filter = {};
  if (movie) { assertObjectId(movie, "movie id"); filter.movie = movie; }
  if (theatre) { assertObjectId(theatre, "theatre id"); filter.theatre = theatre; }
  if (city) {
    const ids = await Theatre.find({ city: new RegExp(`^${escapeRegex(city)}$`, "i"), isActive: true }).distinct("_id");
    filter.theatre = filter.theatre ? (ids.some((i) => String(i) === String(filter.theatre)) ? filter.theatre : null) : { $in: ids };
  }
  const time = {};
  if (from) time.$gte = new Date(from);
  if (to) time.$lt = new Date(to);
  if (!(isAdmin && req.query.includePast === "true")) time.$gte = new Date(Math.max(Date.now(), time.$gte ? time.$gte.getTime() : 0));
  if (Object.keys(time).length) filter.startTime = time;
  if (!isAdmin || req.query.status !== "all") filter.status = "scheduled";

  const { page, limit, skip } = paginate({ ...req.query, limit: req.query.limit || (isAdmin ? 50 : 100) });
  const [items, total] = await Promise.all([
    Show.find(filter)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate("theatre", "name city address amenities")
      .populate("movie", "title poster duration certificate languages slug"),
    Show.countDocuments(filter),
  ]);
  res.json({ success: true, items: items.map(summarise), total, page, pages: Math.ceil(total / limit) || 1 });
}

// GET /api/shows/:id -> full layout + seat status for the seat picker
export async function getShow(req, res) {
  assertObjectId(req.params.id, "show id");
  await purgeExpiredLocks(req.params.id);
  const show = await Show.findById(req.params.id)
    .populate("theatre", "name city address amenities")
    .populate("movie", "title poster backdrop duration certificate languages genres slug");
  if (!show) throw new AppError("Show not found", 404);
  const seats = seatStatusForViewer(show, req.user?._id);
  res.json({ success: true, show: summarise(show), seats, serverTime: new Date() });
}

async function findOverlap(theatreId, screenName, start, end, excludeId) {
  return Show.findOne({
    theatre: theatreId,
    screenName,
    status: "scheduled",
    startTime: { $lt: end },
    endTime: { $gt: start },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).populate("movie", "title");
}

// POST /api/shows (admin)
// body: { movie, theatre, screenName, language, format, startTimes: [ISO...], prices?: { Recliner: 450 } }
export async function createShows(req, res) {
  requireFields(req.body, ["movie", "theatre", "screenName", "language"]);
  const { movie: movieId, theatre: theatreId, screenName, language, format = "2D", prices = {} } = req.body;
  assertObjectId(movieId, "movie id");
  assertObjectId(theatreId, "theatre id");
  const startTimes = toArray(req.body.startTimes || req.body.startTime).map((s) => new Date(s));
  if (!startTimes.length || startTimes.some((d) => Number.isNaN(d.getTime()))) throw new AppError("Provide at least one valid start time", 400);

  const [movie, theatre] = await Promise.all([Movie.findById(movieId), Theatre.findById(theatreId)]);
  if (!movie) throw new AppError("Movie not found", 404);
  if (!theatre) throw new AppError("Theatre not found", 404);
  const screen = theatre.screens.find((s) => s.name === screenName);
  if (!screen) throw new AppError(`Screen "${screenName}" does not exist at ${theatre.name}`, 400);

  const layout = screen.layout.toObject();
  layout.categories = layout.categories.map((c) => ({ ...c, price: prices[c.name] !== undefined && prices[c.name] !== "" ? Number(prices[c.name]) : c.price }));

  const created = [];
  const skipped = [];
  for (const start of startTimes) {
    if (start.getTime() < Date.now()) { skipped.push({ startTime: start, reason: "Start time is in the past" }); continue; }
    const end = new Date(start.getTime() + (movie.duration + CLEANING_BUFFER_MIN) * 60000);
    // eslint-disable-next-line no-await-in-loop
    const clash = await findOverlap(theatre._id, screenName, start, end);
    if (clash) { skipped.push({ startTime: start, reason: `Overlaps "${clash.movie?.title || "another show"}" at ${clash.startTime.toISOString()}` }); continue; }
    // eslint-disable-next-line no-await-in-loop
    const show = await Show.create({ movie: movie._id, theatre: theatre._id, screenName, startTime: start, endTime: end, language, format, layout });
    created.push(show);
  }
  if (!created.length) throw new AppError(`No shows created. ${skipped.map((s) => s.reason).join("; ")}`, 409, { skipped });
  res.status(201).json({ success: true, message: `${created.length} show(s) scheduled`, created, skipped });
}

// Cancels a show and every active booking on it (refunds are initiated for paid ones).
async function cancelShowCascade(show, reason) {
  const bookings = await Booking.find({ show: show._id, status: { $in: ["pending", "confirmed"] } });
  for (const b of bookings) {
    const wasPaid = b.status === "confirmed";
    b.status = "cancelled";
    b.cancelledAt = new Date();
    b.cancellationReason = reason;
    // eslint-disable-next-line no-await-in-loop
    if (wasPaid) await refundBookingPayment(b);
    else b.paymentStatus = "failed";
    // eslint-disable-next-line no-await-in-loop
    await b.save();
  }
  show.status = "cancelled";
  show.seatLocks = [];
  await show.save();
  return bookings.length;
}

// PUT /api/shows/:id (admin): { startTime?, language?, format?, prices?, status? }
export async function updateShow(req, res) {
  assertObjectId(req.params.id, "show id");
  const show = await Show.findById(req.params.id).populate("movie", "duration title");
  if (!show) throw new AppError("Show not found", 404);
  const { startTime, language, format, prices, status } = req.body;

  if (status === "cancelled" && show.status !== "cancelled") {
    const n = await cancelShowCascade(show, "Show cancelled by the cinema");
    return res.json({ success: true, message: `Show cancelled. ${n} booking(s) cancelled and refunds initiated.`, show });
  }
  if (status === "scheduled" && show.status === "cancelled") show.status = "scheduled";

  if (startTime) {
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) throw new AppError("Invalid start time", 400);
    if (show.bookedSeats.length) throw new AppError("Cannot move a show that already has bookings. Cancel it instead.", 409);
    const end = new Date(start.getTime() + ((show.movie?.duration || 120) + CLEANING_BUFFER_MIN) * 60000);
    const clash = await findOverlap(show.theatre, show.screenName, start, end, show._id);
    if (clash) throw new AppError(`New time overlaps "${clash.movie?.title}" on the same screen`, 409);
    show.startTime = start;
    show.endTime = end;
  }
  if (language) show.language = language;
  if (format) show.format = format;
  if (prices && typeof prices === "object") {
    show.layout.categories.forEach((c) => {
      if (prices[c.name] !== undefined && prices[c.name] !== "") c.price = Number(prices[c.name]);
    });
    show.markModified("layout");
  }
  await show.save();
  res.json({ success: true, message: "Show updated", show });
}

// DELETE /api/shows/:id (admin)
export async function deleteShow(req, res) {
  if (!isObjectId(req.params.id)) throw new AppError("Invalid show id", 400);
  const show = await Show.findById(req.params.id);
  if (!show) throw new AppError("Show not found", 404);
  const confirmed = await Booking.countDocuments({ show: show._id, status: "confirmed" });
  if (confirmed && show.startTime > new Date()) throw new AppError(`This show has ${confirmed} confirmed booking(s). Cancel the show instead of deleting it.`, 409);
  await Booking.updateMany({ show: show._id, status: "pending" }, { status: "cancelled", paymentStatus: "failed", cancellationReason: "Show removed" });
  await show.deleteOne();
  res.json({ success: true, message: "Show deleted" });
}
