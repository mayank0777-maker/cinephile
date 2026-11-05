import mongoose from "mongoose";
import { env } from "../config/env.js";
import Booking, { BOOKING_STATUSES } from "../models/Booking.js";
import Show, { describeSeat } from "../models/Show.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { assertObjectId, escapeRegex, generateBookingId, isObjectId, paginate, requireFields, toArray } from "../utils/helpers.js";
import { commitSeats, lockSeats, releaseLocksForBooking, returnSeats, seatStatusForViewer } from "../utils/seatService.js";
import { refundBookingPayment } from "./paymentController.js";

async function uniqueBookingId() {
  for (let i = 0; i < 5; i++) {
    const id = generateBookingId();
    // eslint-disable-next-line no-await-in-loop
    if (!(await Booking.exists({ bookingId: id }))) return id;
  }
  throw new AppError("Could not generate booking id, please retry", 500);
}

async function findBookingForUser(idOrRef, user) {
  const query = isObjectId(idOrRef) ? { _id: idOrRef } : { bookingId: String(idOrRef).toUpperCase() };
  const booking = await Booking.findOne(query).populate("payment", "provider orderId paymentId status amount verifiedAt refundId method methodLabel");
  if (!booking) throw new AppError("Booking not found", 404);
  if (user.role !== "admin" && String(booking.user) !== String(user._id)) throw new AppError("Booking not found", 404);
  return booking;
}

// POST /api/bookings  { showId, seats: ["C7","C8"] }
// Validates seats, prices them on the server, holds them atomically and creates a pending booking.
export async function createBooking(req, res) {
  requireFields(req.body, ["showId"]);
  const { showId } = req.body;
  assertObjectId(showId, "show id");
  const seatIds = [...new Set(toArray(req.body.seats).map((s) => String(s).trim().toUpperCase()))];
  if (!seatIds.length) throw new AppError("Select at least one seat", 400);
  if (seatIds.length > env.MAX_SEATS_PER_BOOKING) throw new AppError(`You can book at most ${env.MAX_SEATS_PER_BOOKING} seats at a time`, 400);

  const show = await Show.findById(showId).populate("movie", "title poster certificate duration").populate("theatre", "name address city");
  if (!show || show.status !== "scheduled") throw new AppError("This show is not available for booking", 404);
  if (show.startTime <= new Date()) throw new AppError("This show has already started", 400);

  // Server-side pricing: never trust prices from the client.
  const seats = seatIds.map((id) => {
    const d = describeSeat(show.layout, id);
    if (!d) throw new AppError(`Seat ${id} does not exist in this screen`, 400);
    return d;
  });
  const subtotal = seats.reduce((n, s) => n + s.price, 0);
  const convenienceFee = env.CONVENIENCE_FEE_PER_TICKET * seats.length;

  // Drop any earlier unpaid hold this user had on the same show (e.g. they went back and changed seats).
  const previous = await Booking.find({ user: req.user._id, show: show._id, status: "pending" });
  for (const p of previous) {
    p.status = "cancelled";
    p.paymentStatus = "failed";
    p.cancellationReason = "Replaced by a new seat selection";
    // eslint-disable-next-line no-await-in-loop
    await p.save();
    // eslint-disable-next-line no-await-in-loop
    await releaseLocksForBooking(show._id, p._id);
  }

  const bookingObjectId = new mongoose.Types.ObjectId();
  const locked = await lockSeats({ showId: show._id, userId: req.user._id, bookingId: bookingObjectId, seatIds, minutes: env.SEAT_LOCK_MINUTES });
  if (!locked) {
    const fresh = await Show.findById(show._id);
    throw new AppError("Sorry, one or more of these seats were just taken. Please choose different seats.", 409, {
      seats: seatStatusForViewer(fresh, req.user._id),
    });
  }

  const lock = locked.seatLocks.find((l) => String(l.booking) === String(bookingObjectId));
  try {
    const booking = await Booking.create({
      _id: bookingObjectId,
      bookingId: await uniqueBookingId(),
      user: req.user._id,
      show: show._id,
      movie: show.movie._id,
      theatre: show.theatre._id,
      snapshot: {
        movieTitle: show.movie.title,
        poster: show.movie.poster,
        certificate: show.movie.certificate,
        duration: show.movie.duration,
        theatreName: show.theatre.name,
        theatreAddress: show.theatre.address,
        city: show.theatre.city,
        screenName: show.screenName,
        startTime: show.startTime,
        language: show.language,
        format: show.format,
      },
      seats,
      subtotal,
      convenienceFee,
      totalAmount: subtotal + convenienceFee,
      expiresAt: lock.expiresAt,
    });
    res.status(201).json({ success: true, message: `Seats held for ${env.SEAT_LOCK_MINUTES} minutes`, booking });
  } catch (err) {
    await releaseLocksForBooking(show._id, bookingObjectId);
    throw err;
  }
}

// GET /api/bookings/my?type=upcoming|past|cancelled|all
export async function myBookings(req, res) {
  const { type = "all" } = req.query;
  const t = new Date();
  const filter = { user: req.user._id };
  if (type === "upcoming") Object.assign(filter, { status: "confirmed", "snapshot.startTime": { $gte: t } });
  else if (type === "past") Object.assign(filter, { status: "confirmed", "snapshot.startTime": { $lt: t } });
  else if (type === "cancelled") Object.assign(filter, { status: { $in: ["cancelled", "failed", "expired"] } });
  else filter.status = { $ne: "pending" };
  const sort = type === "upcoming" ? { "snapshot.startTime": 1 } : { createdAt: -1 };
  const items = await Booking.find(filter).sort(sort).limit(100);
  res.json({ success: true, items });
}

// GET /api/bookings/:id  (Mongo _id or public booking reference)
export async function getBooking(req, res) {
  const booking = await findBookingForUser(req.params.id, req.user);
  const cutoff = new Date(booking.snapshot.startTime).getTime() - env.CANCELLATION_CUTOFF_HOURS * 3600 * 1000;
  res.json({
    success: true,
    booking,
    canCancel: booking.status === "confirmed" && Date.now() < cutoff,
    cancellationCutoffHours: env.CANCELLATION_CUTOFF_HOURS,
  });
}

// POST /api/bookings/:id/cancel — users may cancel confirmed tickets up to N hours before the show.
export async function cancelBooking(req, res) {
  const booking = await findBookingForUser(req.params.id, req.user);
  if (booking.status !== "confirmed") throw new AppError(`Only confirmed bookings can be cancelled (this one is ${booking.status})`, 400);
  const cutoff = new Date(booking.snapshot.startTime).getTime() - env.CANCELLATION_CUTOFF_HOURS * 3600 * 1000;
  if (req.user.role !== "admin" && Date.now() >= cutoff)
    throw new AppError(`Tickets can only be cancelled up to ${env.CANCELLATION_CUTOFF_HOURS} hours before the show`, 400);

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.cancellationReason = String(req.body?.reason || "Cancelled by customer").slice(0, 200);
  await refundBookingPayment(booking);
  await booking.save();
  await returnSeats(booking.show, booking.seats.map((s) => s.seatId));
  res.json({ success: true, message: "Booking cancelled. Your refund has been initiated.", booking });
}

// POST /api/bookings/:id/release — user abandons checkout; frees the held seats immediately.
export async function releaseBooking(req, res) {
  const booking = await findBookingForUser(req.params.id, req.user);
  if (booking.status !== "pending") return res.json({ success: true, message: "Nothing to release", booking });
  booking.status = "cancelled";
  booking.paymentStatus = "failed";
  booking.cancellationReason = "Checkout abandoned";
  await booking.save();
  await releaseLocksForBooking(booking.show, booking._id);
  res.json({ success: true, message: "Seats released", booking });
}

/* ------------------------------- admin ------------------------------- */

// GET /api/bookings?status=&search=&from=&to=&page=&limit=   (admin)
export async function listAllBookings(req, res) {
  const { status, search, from, to } = req.query;
  const filter = {};
  if (status && BOOKING_STATUSES.includes(status)) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lt = new Date(to);
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    const users = await User.find({ $or: [{ email: rx }, { name: rx }] }).distinct("_id");
    filter.$or = [{ bookingId: rx }, { "snapshot.movieTitle": rx }, { user: { $in: users } }];
  }
  const { page, limit, skip } = paginate(req.query);
  const [items, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "name email phone").populate("payment", "provider orderId paymentId status method methodLabel"),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, items, total, page, pages: Math.ceil(total / limit) || 1 });
}

// PATCH /api/bookings/:id/status  { status: "cancelled" | "confirmed", reason? }   (admin)
export async function adminUpdateStatus(req, res) {
  assertObjectId(req.params.id, "booking id");
  const { status, reason } = req.body || {};
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError("Booking not found", 404);

  if (status === "cancelled") {
    if (!["confirmed", "pending"].includes(booking.status)) throw new AppError(`Booking is already ${booking.status}`, 400);
    const wasConfirmed = booking.status === "confirmed";
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || "Cancelled by admin";
    if (wasConfirmed) {
      await refundBookingPayment(booking);
      await returnSeats(booking.show, booking.seats.map((s) => s.seatId));
    } else {
      booking.paymentStatus = "failed";
      await releaseLocksForBooking(booking.show, booking._id);
    }
    await booking.save();
    return res.json({ success: true, message: "Booking cancelled", booking });
  }

  if (status === "confirmed") {
    // Box-office / offline payment collected by staff for a pending hold.
    if (booking.status !== "pending") throw new AppError("Only pending bookings can be confirmed manually", 400);
    const ok = await commitSeats({ showId: booking.show, bookingId: booking._id, seatIds: booking.seats.map((s) => s.seatId) });
    if (!ok) throw new AppError("These seats are no longer available", 409);
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.confirmedAt = new Date();
    booking.expiresAt = undefined;
    await booking.save();
    return res.json({ success: true, message: "Booking confirmed (offline payment)", booking });
  }

  throw new AppError('status must be "cancelled" or "confirmed"', 400);
}
