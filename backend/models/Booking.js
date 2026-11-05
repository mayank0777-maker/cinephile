import mongoose from "mongoose";

export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "failed", "expired"];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refund_initiated", "refunded"];

const bookedSeatSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true }, // public reference, e.g. CNP-7K2M9QX4
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true },
    // Denormalised snapshot so tickets still render if the movie / theatre is later edited or removed.
    snapshot: {
      movieTitle: String,
      poster: String,
      certificate: String,
      duration: Number,
      theatreName: String,
      theatreAddress: String,
      city: String,
      screenName: String,
      startTime: Date,
      language: String,
      format: String,
    },
    seats: {
      type: [bookedSeatSchema],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: "Select at least one seat" },
    },
    subtotal: { type: Number, required: true, min: 0 },
    convenienceFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 }, // rupees
    currency: { type: String, default: "INR" },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    expiresAt: { type: Date }, // seat hold expiry while pending
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationReason: { type: String, default: "" },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

export default mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
