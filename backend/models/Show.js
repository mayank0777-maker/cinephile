import mongoose from "mongoose";
import { layoutSchema } from "./Theatre.js";

// Temporary hold on a seat while the user pays. Expired locks are ignored and cleaned up.
const seatLockSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: [true, "Movie is required"] },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: [true, "Theatre is required"] },
    screenName: { type: String, required: [true, "Screen is required"], trim: true },
    startTime: { type: Date, required: [true, "Start time is required"] },
    endTime: { type: Date, required: true },
    language: { type: String, required: [true, "Language is required"], trim: true },
    format: { type: String, default: "2D", trim: true },
    // Snapshot of the screen layout and prices at creation time, so later theatre edits never break existing bookings.
    layout: { type: layoutSchema, required: true },
    bookedSeats: { type: [String], default: [] },
    seatLocks: { type: [seatLockSchema], default: [] },
    status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled", index: true },
  },
  { timestamps: true }
);

showSchema.index({ movie: 1, startTime: 1 });
showSchema.index({ theatre: 1, startTime: 1 });
showSchema.index({ theatre: 1, screenName: 1, startTime: 1 }, { unique: true });

showSchema.virtual("totalSeats").get(function totalSeats() {
  const rows = (this.layout?.categories || []).reduce((n, c) => n + c.rows.length, 0);
  return rows * (this.layout?.seatsPerRow || 0);
});

// Returns { seatId -> { category, price } } lookup helpers for a layout.
export function describeSeat(layout, seatId) {
  const m = /^([A-Z])(\d{1,2})$/.exec(String(seatId || "").toUpperCase());
  if (!m) return null;
  const [, row, numStr] = m;
  const num = Number(numStr);
  if (num < 1 || num > layout.seatsPerRow) return null;
  const category = layout.categories.find((c) => c.rows.includes(row));
  if (!category) return null;
  return { seatId: `${row}${num}`, category: category.name, price: category.price };
}

export default mongoose.models.Show || mongoose.model("Show", showSchema);
