import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import User from "../models/User.js";

// GET /api/admin/stats?days=14
export async function getStats(req, res) {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 14));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const now = new Date();

  const [users, movies, theatres, upcomingShows, bookingsByStatus, revenueAgg, daily, topMovies, recent, cities] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Movie.countDocuments({ status: { $ne: "ended" } }),
    Theatre.countDocuments({ isActive: true }),
    Show.countDocuments({ status: "scheduled", startTime: { $gt: now } }),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, revenue: { $sum: "$totalAmount" }, tickets: { $sum: { $size: "$seats" } }, fees: { $sum: "$convenienceFee" } } },
    ]),
    Booking.aggregate([
      { $match: { status: "confirmed", confirmedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$confirmedAt", timezone: req.query.tz || "Asia/Kolkata" } },
          revenue: { $sum: "$totalAmount" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: "$movie", title: { $first: "$snapshot.movieTitle" }, poster: { $first: "$snapshot.poster" }, revenue: { $sum: "$totalAmount" }, tickets: { $sum: { $size: "$seats" } } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]),
    Booking.find({ status: { $ne: "pending" } }).sort({ createdAt: -1 }).limit(6).populate("user", "name email"),
    Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: "$snapshot.city", revenue: { $sum: "$totalAmount" }, bookings: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  // Fill missing days with zeros so the chart has a continuous axis.
  const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toLocaleDateString("en-CA", { timeZone: req.query.tz || "Asia/Kolkata" });
    series.push({ date: key, revenue: byDay[key]?.revenue || 0, bookings: byDay[key]?.bookings || 0 });
  }

  const statusCounts = Object.fromEntries(bookingsByStatus.map((s) => [s._id, s.count]));
  res.json({
    success: true,
    totals: {
      users,
      movies,
      theatres,
      upcomingShows,
      bookings: Object.values(statusCounts).reduce((a, b) => a + b, 0) - (statusCounts.pending || 0),
      confirmedBookings: statusCounts.confirmed || 0,
      revenue: revenueAgg[0]?.revenue || 0,
      ticketsSold: revenueAgg[0]?.tickets || 0,
      convenienceFees: revenueAgg[0]?.fees || 0,
    },
    statusCounts,
    revenueSeries: series,
    topMovies,
    revenueByCity: cities,
    recentBookings: recent,
  });
}
