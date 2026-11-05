import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["razorpay", "demo"], required: true },
    orderId: { type: String, required: true, unique: true }, // Razorpay order_id (or demo_ id)
    paymentId: { type: String, default: "" }, // Razorpay payment_id after success
    signature: { type: String, default: "" },
    method: { type: String, default: "" }, // card | upi | netbanking | wallet
    methodLabel: { type: String, default: "" }, // e.g. "Visa •••• 1111" (never the full card number)
    amount: { type: Number, required: true, min: 0 }, // paise
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed", "refund_initiated", "refunded"], default: "created" },
    failureReason: { type: String, default: "" },
    refundId: { type: String, default: "" },
    verifiedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
