/**
 * Seat locking — how Cinephile prevents double booking
 * ----------------------------------------------------
 * Each Show document stores:
 *   bookedSeats: ["A1", "A2", ...]                         -> permanently sold seats
 *   seatLocks:   [{ seatId, user, booking, expiresAt }]    -> temporary holds during checkout
 *
 * Locking uses ONE atomic findOneAndUpdate whose filter only matches when none of the
 * requested seats is booked or held by a still-valid lock. MongoDB applies a single-document
 * update atomically, so if two users click "Pay" for seat C7 at the same instant only one
 * update can match; the other gets null and is told the seat was just taken.
 *
 * Confirming a booking (after payment verification) moves the seats from seatLocks to
 * bookedSeats in another conditional atomic update.
 */
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

const now = () => new Date();

// Removes expired locks from a show (housekeeping, safe to call any time).
export function purgeExpiredLocks(showId) {
  return Show.updateOne({ _id: showId }, { $pull: { seatLocks: { expiresAt: { $lte: now() } } } });
}

// Releases every lock held for a booking.
export function releaseLocksForBooking(showId, bookingId) {
  return Show.updateOne({ _id: showId }, { $pull: { seatLocks: { booking: bookingId } } });
}

/**
 * Atomically locks seats for a booking. Returns the updated show, or null if any seat is
 * already booked / held by someone else, or if the show is no longer bookable.
 */
export async function lockSeats({ showId, userId, bookingId, seatIds, minutes }) {
  await purgeExpiredLocks(showId);
  const t = now();
  const expiresAt = new Date(t.getTime() + minutes * 60 * 1000);
  return Show.findOneAndUpdate(
    {
      _id: showId,
      status: "scheduled",
      startTime: { $gt: t },
      bookedSeats: { $nin: seatIds },
      seatLocks: { $not: { $elemMatch: { seatId: { $in: seatIds }, expiresAt: { $gt: t } } } },
    },
    { $push: { seatLocks: { $each: seatIds.map((seatId) => ({ seatId, user: userId, booking: bookingId, expiresAt })) } } },
    { new: true }
  );
}

/**
 * Converts a booking's held seats into sold seats. Succeeds when the seats are still not sold
 * and not held by a *different* booking (so a payment that completes just after the hold
 * expired still succeeds if nobody else grabbed the seats meanwhile).
 */
export async function commitSeats({ showId, bookingId, seatIds }) {
  const t = now();
  const res = await Show.findOneAndUpdate(
    {
      _id: showId,
      bookedSeats: { $nin: seatIds },
      seatLocks: { $not: { $elemMatch: { seatId: { $in: seatIds }, booking: { $ne: bookingId }, expiresAt: { $gt: t } } } },
    },
    { $addToSet: { bookedSeats: { $each: seatIds } }, $pull: { seatLocks: { booking: bookingId } } },
    { new: true }
  );
  return Boolean(res);
}

// Returns sold seats back to inventory (used for cancellations).
export function returnSeats(showId, seatIds) {
  return Show.updateOne({ _id: showId }, { $pull: { bookedSeats: { $in: seatIds } } });
}

/**
 * Marks stale pending bookings as expired and frees their holds.
 * Runs every minute from server.js; a 1 minute grace period lets in-flight payment callbacks finish.
 */
export async function expireStaleBookings() {
  const cutoff = new Date(Date.now() - 60 * 1000);
  const stale = await Booking.find({ status: "pending", expiresAt: { $lt: cutoff } }).select("_id show").lean();
  if (!stale.length) return 0;
  await Booking.updateMany(
    { _id: { $in: stale.map((b) => b._id) }, status: "pending" },
    { status: "expired", paymentStatus: "failed", cancellationReason: "Seat hold expired before payment" }
  );
  await Promise.all(stale.map((b) => releaseLocksForBooking(b.show, b._id)));
  return stale.length;
}

// Seat status map for one show from the point of view of a viewer.
export function seatStatusForViewer(show, viewerId) {
  const t = now();
  const locked = [];
  const mine = [];
  for (const l of show.seatLocks || []) {
    if (new Date(l.expiresAt) <= t) continue;
    if (viewerId && String(l.user) === String(viewerId)) mine.push(l.seatId);
    else locked.push(l.seatId);
  }
  return { booked: show.bookedSeats || [], locked, mine };
}
