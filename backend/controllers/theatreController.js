import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Theatre from "../models/Theatre.js";
import AppError from "../utils/AppError.js";
import { escapeRegex, toArray } from "../utils/helpers.js";

// GET /api/theatres?city=&search=
export async function listTheatres(req, res) {
  const filter = {};
  if (!(req.user?.role === "admin" && req.query.all === "true")) filter.isActive = true;
  if (req.query.city) filter.city = new RegExp(`^${escapeRegex(req.query.city)}$`, "i");
  if (req.query.search) filter.name = new RegExp(escapeRegex(req.query.search), "i");
  const items = await Theatre.find(filter).sort({ city: 1, name: 1 });
  res.json({ success: true, items });
}

// GET /api/theatres/cities
export async function listCities(_req, res) {
  const cities = await Theatre.distinct("city", { isActive: true });
  res.json({ success: true, cities: cities.sort() });
}

// GET /api/theatres/:id
export async function getTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError("Theatre not found", 404);
  res.json({ success: true, theatre });
}

function normaliseScreens(screens) {
  return (Array.isArray(screens) ? screens : []).map((s) => ({
    ...(s._id ? { _id: s._id } : {}),
    name: String(s.name || "").trim(),
    formats: toArray(s.formats).length ? toArray(s.formats) : ["2D"],
    layout: {
      seatsPerRow: Number(s.layout?.seatsPerRow),
      aisleAfter: toArray(s.layout?.aisleAfter).map(Number).filter((n) => n > 0),
      categories: (s.layout?.categories || []).map((c) => ({
        name: String(c.name || "").trim(),
        price: Number(c.price),
        rows: toArray(c.rows).map((r) => String(r).trim().toUpperCase()),
      })),
    },
  }));
}

function buildTheatreData(body) {
  const data = {};
  for (const k of ["name", "city", "address"]) if (body[k] !== undefined) data[k] = String(body[k]).trim();
  if (body.amenities !== undefined) data.amenities = toArray(body.amenities);
  if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === "true";
  if (body.screens !== undefined) data.screens = normaliseScreens(body.screens);
  return data;
}

// POST /api/theatres (admin)
export async function createTheatre(req, res) {
  const theatre = await Theatre.create(buildTheatreData(req.body));
  res.status(201).json({ success: true, message: "Theatre added", theatre });
}

// PUT /api/theatres/:id (admin) — existing shows keep their own layout snapshot.
export async function updateTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError("Theatre not found", 404);
  theatre.set(buildTheatreData(req.body));
  await theatre.save();
  res.json({ success: true, message: "Theatre updated", theatre });
}

// DELETE /api/theatres/:id (admin)
export async function deleteTheatre(req, res) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError("Theatre not found", 404);
  const upcoming = await Show.find({ theatre: theatre._id, startTime: { $gt: new Date() } }).distinct("_id");
  const active = await Booking.countDocuments({ show: { $in: upcoming }, status: { $in: ["confirmed", "pending"] } });
  if (active) throw new AppError(`Cannot delete: ${active} active booking(s) exist at this theatre. Deactivate it instead.`, 409);
  await Show.deleteMany({ theatre: theatre._id, startTime: { $gt: new Date() } });
  await theatre.deleteOne();
  res.json({ success: true, message: "Theatre deleted" });
}
