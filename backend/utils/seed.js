/**
 * Seeds the database with demo data.  Usage:  npm run seed
 *
 * WARNING: wipes the users, movies, theatres, shows, bookings, payments and reviews
 * collections of the database in MONGO_URI before inserting fresh data.
 *
 * Creates:
 *   - admin@cinephile.com / Admin@123   (admin)
 *   - user@cinephile.com  / User@123    (regular user with sample bookings)
 *   - 5 sample customers (password: User@123)
 *   - 18 movies, 8 theatres in 5 cities, ~7 days of upcoming shows
 *   - past shows + sample confirmed bookings so the admin dashboard has revenue history
 */
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { generateBookingId } from "./helpers.js";
import { movies as movieData, sampleCustomers, sampleReviews, theatres as theatreData } from "./seedData.js";

const TZ = "Asia/Kolkata";
const UPCOMING_DAYS = 7;
const PAST_DAYS = 13;
const SLOTS = ["09:30", "13:15", "17:00", "20:45"];
const PAST_SLOTS = ["13:15", "20:45"];
const CLEANING_BUFFER_MIN = 20;

// Seeded pseudo-random generator so every seed run produces similar data.
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const istDate = (offsetDays) => {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD in IST
  const d = new Date(`${today}T00:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
};
const istTime = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00+05:30`);

function contiguousSeats(layout, show, count) {
  const rows = layout.categories.flatMap((c) => c.rows);
  for (let attempt = 0; attempt < 20; attempt++) {
    const row = pick(rows);
    const start = 1 + Math.floor(rand() * (layout.seatsPerRow - count + 1));
    const ids = Array.from({ length: count }, (_, i) => `${row}${start + i}`);
    if (ids.every((id) => !show.bookedSeats.includes(id))) return ids;
  }
  return null;
}

function priceSeats(layout, ids) {
  return ids.map((id) => {
    const cat = layout.categories.find((c) => c.rows.includes(id[0]));
    return { seatId: id, category: cat.name, price: cat.price };
  });
}

async function run() {
  await connectDB();
  console.log("[seed] Clearing collections…");
  await Promise.all([User, Movie, Theatre, Show, Booking, Payment, Review].map((m) => m.deleteMany({})));
  await Promise.all([User, Movie, Theatre, Show, Booking, Payment, Review].map((m) => m.syncIndexes()));

  console.log("[seed] Users…");
  const admin = await User.create({ name: "Cinephile Admin", email: "admin@cinephile.com", password: "Admin@123", role: "admin", phone: "9000000001", city: "Mumbai" });
  const demo = await User.create({ name: "Demo User", email: "user@cinephile.com", password: "User@123", phone: "9000000002", city: "Mumbai" });
  const customers = [];
  for (const c of sampleCustomers) customers.push(await User.create({ ...c, password: "User@123" })); // eslint-disable-line no-await-in-loop
  const allCustomers = [demo, ...customers];

  console.log("[seed] Movies…");
  const movies = [];
  for (const m of movieData) {
    const { releaseOffset, releaseDateFixed, blockbuster, cast, crew, ...rest } = m;
    const releaseDate = releaseDateFixed ? istTime(releaseDateFixed, "00:00") : istTime(istDate(releaseOffset), "00:00");
    if (rest.status === "auto") rest.status = releaseDate.getTime() <= Date.now() ? "now_showing" : "upcoming";
    // eslint-disable-next-line no-await-in-loop
    const doc = await Movie.create({
        ...rest,
        releaseDate,
        cast: cast.map(([name, role]) => ({ name, role })),
        crew: crew.map(([name, role]) => ({ name, role })),
      });
    if (blockbuster) doc.$locals.blockbuster = true;
    movies.push(doc);
  }
  const blockbusterMovie = movies.find((m) => m.$locals.blockbuster);
  const nowShowing = movies.filter((m) => m.status === "now_showing" && m !== blockbusterMovie);
  const imaxMovies = nowShowing.filter((m) => m.formats.includes("IMAX"));

  console.log("[seed] Theatres…");
  const theatres = await Theatre.insertMany(theatreData);

  console.log("[seed] Shows…");
  const showDocs = [];
  let screenIndex = 0;
  for (const t of theatres) {
    for (const sc of t.screens) {
      const isImax = sc.formats.includes("IMAX");
      const pool = isImax ? imaxMovies : nowShowing;
      const addShows = (dayOffset, slots) => {
        const dateStr = istDate(dayOffset);
        slots.forEach((slot, k) => {
          const start = istTime(dateStr, slot);
          const bigRelease = blockbusterMovie && sc === t.screens[0] && start >= blockbusterMovie.releaseDate;
          const movie = bigRelease ? blockbusterMovie : pool[(screenIndex * 3 + k + dayOffset + PAST_DAYS) % pool.length];
          const format = isImax && movie.formats.includes("IMAX") ? "IMAX" : movie.formats.includes("3D") && sc.formats.includes("3D") && k % 2 ? "3D" : "2D";
          showDocs.push({
            movie: movie._id,
            theatre: t._id,
            screenName: sc.name,
            startTime: start,
            endTime: new Date(start.getTime() + (movie.duration + CLEANING_BUFFER_MIN) * 60000),
            language: movie.languages[(dayOffset + k + PAST_DAYS) % movie.languages.length],
            format,
            layout: sc.layout.toObject(),
            bookedSeats: [],
          });
        });
      };
      for (let d = -PAST_DAYS; d < 0; d++) addShows(d, PAST_SLOTS);
      for (let d = 0; d < UPCOMING_DAYS; d++) addShows(d, SLOTS);
      screenIndex++;
    }
  }

  // Sample bookings (past ones feed the revenue chart; upcoming ones make seat maps look real).
  console.log("[seed] Sample bookings…");
  const movieById = Object.fromEntries(movies.map((m) => [String(m._id), m]));
  const theatreById = Object.fromEntries(theatres.map((t) => [String(t._id), t]));
  const bookings = [];
  const payments = [];
  const now = Date.now();
  const makeBooking = (show, user, count, status = "confirmed") => {
    const ids = contiguousSeats(show.layout, show, count);
    if (!ids) return null;
    const seats = priceSeats(show.layout, ids);
    const subtotal = seats.reduce((n, x) => n + x.price, 0);
    const fee = env.CONVENIENCE_FEE_PER_TICKET * seats.length;
    const movie = movieById[String(show.movie)];
    const theatre = theatreById[String(show.theatre)];
    // booked 2–74 h before the show, and never in the future (spread over the last 3 days for upcoming shows)
    const createdAt = new Date(Math.min(now - 60000 - rand() * 72 * 3600 * 1000, show.startTime.getTime() - (2 + rand() * 72) * 3600 * 1000));
    const _id = new mongoose.Types.ObjectId();
    const paymentId = new mongoose.Types.ObjectId();
    if (status === "confirmed") show.bookedSeats.push(...ids);
    payments.push({
      _id: paymentId,
      booking: _id,
      user: user._id,
      provider: "demo",
      orderId: `demo_order_seed_${_id}`,
      paymentId: `demo_pay_seed_${_id}`,
      amount: (subtotal + fee) * 100,
      status: status === "confirmed" ? "paid" : "refunded",
      verifiedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
    const b = {
      _id,
      bookingId: generateBookingId(),
      user: user._id,
      show: show._id,
      movie: show.movie,
      theatre: show.theatre,
      snapshot: {
        movieTitle: movie.title,
        poster: movie.poster,
        certificate: movie.certificate,
        duration: movie.duration,
        theatreName: theatre.name,
        theatreAddress: theatre.address,
        city: theatre.city,
        screenName: show.screenName,
        startTime: show.startTime,
        language: show.language,
        format: show.format,
      },
      seats,
      subtotal,
      convenienceFee: fee,
      totalAmount: subtotal + fee,
      status,
      paymentStatus: status === "confirmed" ? "paid" : "refunded",
      payment: paymentId,
      confirmedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      ...(status === "cancelled" ? { cancelledAt: new Date(createdAt.getTime() + 3600000), cancellationReason: "Cancelled by customer" } : {}),
    };
    bookings.push(b);
    return b;
  };

  // give every show an _id up front so bookings can reference it
  showDocs.forEach((sd) => { sd._id = new mongoose.Types.ObjectId(); });
  for (const show of showDocs) {
    const isPast = show.startTime.getTime() < now;
    const n = isPast ? Math.floor(rand() * 4) : rand() < 0.45 ? 1 + Math.floor(rand() * 5) : 0;
    for (let i = 0; i < n; i++) makeBooking(show, pick(customers), 1 + Math.floor(rand() * 4));
  }

  // A few bookings for the demo user so their dashboard is not empty.
  const mumbaiIds = theatres.filter((t) => t.city === "Mumbai").map((t) => String(t._id));
  const mumbaiUpcoming = showDocs.filter((x) => mumbaiIds.includes(String(x.theatre)) && x.startTime.getTime() > now + 6 * 3600 * 1000);
  const mumbaiPast = showDocs.filter((x) => mumbaiIds.includes(String(x.theatre)) && x.startTime.getTime() < now);
  if (mumbaiUpcoming.length) {
    makeBooking(mumbaiUpcoming[3] || mumbaiUpcoming[0], demo, 2);
    makeBooking(mumbaiUpcoming[Math.floor(mumbaiUpcoming.length / 2)], demo, 3);
  }
  if (mumbaiPast.length) {
    makeBooking(mumbaiPast[mumbaiPast.length - 2] || mumbaiPast[0], demo, 2);
    makeBooking(mumbaiPast[Math.floor(mumbaiPast.length / 3)], demo, 2, "cancelled");
  }

  await Show.insertMany(showDocs);
  await Payment.insertMany(payments);
  await Booking.insertMany(bookings);

  console.log("[seed] Reviews and watchlist…");
  for (const m of nowShowing) {
    const reviewers = [...allCustomers].sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 3));
    for (const u of reviewers) {
      const rating = Math.max(5, Math.min(10, Math.round(m.rating + (rand() * 2 - 1))));
      // eslint-disable-next-line no-await-in-loop
      await Review.create({ user: u._id, movie: m._id, rating, comment: pick(sampleReviews) });
    }
    await Review.recalculate(m._id); // eslint-disable-line no-await-in-loop
  }
  demo.watchlist = movies.filter((m) => m.status === "upcoming").slice(0, 2).map((m) => m._id);
  await demo.save();

  const upcomingCount = showDocs.filter((x) => x.startTime.getTime() > now).length;
  console.log("\n[seed] Done ✔");
  console.log(`  movies: ${movies.length}   theatres: ${theatres.length}   shows: ${showDocs.length} (${upcomingCount} upcoming)   bookings: ${bookings.length}`);
  console.log("  Admin login : admin@cinephile.com / Admin@123");
  console.log("  User login  : user@cinephile.com  / User@123\n");
  void admin;
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("[seed] Failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
