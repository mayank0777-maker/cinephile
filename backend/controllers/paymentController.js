/**
 * Payments (Razorpay test mode)
 * -----------------------------
 * 1. POST /api/payments/order   -> server creates a Razorpay order for the pending booking amount
 * 2. Browser opens Razorpay Checkout with the PUBLIC key id + order id
 * 3. POST /api/payments/verify  -> server recomputes HMAC_SHA256(order_id|payment_id, KEY_SECRET)
 *                                  and only then confirms the booking and sells the seats
 * The key secret never leaves the server.
 *
 * Demo mode (ALLOW_DEMO_PAYMENTS=true and no Razorpay keys): the same flow, but step 2 is a
 * clearly labelled on-site "demo gateway" and step 3 is /api/payments/demo/complete.
 */
import crypto from "crypto";
import { env, paymentMode } from "../config/env.js";
import { getRazorpay } from "../config/razorpay.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import AppError from "../utils/AppError.js";
import { assertObjectId, requireFields } from "../utils/helpers.js";
import { commitSeats, releaseLocksForBooking } from "../utils/seatService.js";

// GET /api/payments/config — public info the frontend needs (never the secret)
export function getPaymentConfig(_req, res) {
  res.json({ success: true, mode: paymentMode(), keyId: paymentMode() === "razorpay" ? env.RAZORPAY_KEY_ID : null, currency: "INR" });
}

async function loadPendingBooking(bookingId, user) {
  assertObjectId(bookingId, "booking id");
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.user) !== String(user._id)) throw new AppError("Booking not found", 404);
  if (booking.status === "confirmed") throw new AppError("This booking is already paid", 400);
  if (booking.status !== "pending") throw new AppError(`This booking is ${booking.status}. Please select seats again.`, 410);
  if (booking.expiresAt && booking.expiresAt < new Date()) throw new AppError("Your seat hold has expired. Please select seats again.", 410);
  return booking;
}

// POST /api/payments/order { bookingId }
export async function createOrder(req, res) {
  requireFields(req.body, ["bookingId"]);
  const mode = paymentMode();
  if (mode === "disabled") throw new AppError("Online payments are not configured on the server. Add Razorpay test keys to backend/.env.", 503);
  const booking = await loadPendingBooking(req.body.bookingId, req.user);
  const amountPaise = Math.round(booking.totalAmount * 100);

  let orderId;
  if (mode === "razorpay") {
    try {
      const order = await getRazorpay().orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: booking.bookingId,
        notes: { bookingId: booking.bookingId, userId: String(req.user._id) },
      });
      orderId = order.id;
    } catch (err) {
      const msg = err?.error?.description || err?.message || "Unknown error";
      throw new AppError(`Payment gateway error: ${msg}`, 502);
    }
  } else {
    orderId = `demo_order_${crypto.randomBytes(8).toString("hex")}`;
  }

  const payment = await Payment.create({ booking: booking._id, user: req.user._id, provider: mode, orderId, amount: amountPaise });
  booking.payment = payment._id;
  await booking.save();

  res.status(201).json({
    success: true,
    mode,
    keyId: mode === "razorpay" ? env.RAZORPAY_KEY_ID : null,
    orderId,
    amount: amountPaise,
    currency: "INR",
    booking: { _id: booking._id, bookingId: booking.bookingId, totalAmount: booking.totalAmount, expiresAt: booking.expiresAt, snapshot: booking.snapshot },
    prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone || "" },
  });
}

// Shared: after a verified payment, sell the seats and confirm the booking.
async function finalisePaidBooking(payment, { paymentId, signature }) {
  const booking = await Booking.findById(payment.booking);
  if (!booking) throw new AppError("Booking not found", 404);

  payment.status = "paid";
  payment.paymentId = paymentId;
  payment.signature = signature || "";
  payment.verifiedAt = new Date();
  await payment.save();

  if (booking.status === "confirmed") return booking; // idempotent (double callbacks)

  const ok = ["pending", "expired"].includes(booking.status)
    ? await commitSeats({ showId: booking.show, bookingId: booking._id, seatIds: booking.seats.map((s) => s.seatId) })
    : false;

  if (!ok) {
    // Money was captured but the seats were lost (hold expired and someone else bought them).
    booking.status = "failed";
    booking.cancellationReason = "Seats became unavailable before payment completed";
    booking.payment = payment._id;
    await refundBookingPayment(booking);
    await booking.save();
    throw new AppError("Payment received, but your seats were released before it completed. A full refund has been initiated.", 409);
  }

  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.payment = payment._id;
  booking.confirmedAt = new Date();
  booking.expiresAt = undefined;
  booking.cancellationReason = "";
  await booking.save();
  return booking;
}

function signaturesMatch(expected, received) {
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(received || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export async function verifyPayment(req, res) {
  requireFields(req.body, ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature"]);
  if (paymentMode() !== "razorpay") throw new AppError("Razorpay is not configured", 400);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;

  const payment = await Payment.findOne({ orderId, provider: "razorpay" });
  if (!payment || String(payment.user) !== String(req.user._id)) throw new AppError("Payment order not found", 404);
  if (payment.status === "paid") {
    const booking = await Booking.findById(payment.booking);
    return res.json({ success: true, message: "Payment already verified", booking });
  }

  const expected = crypto.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  if (!signaturesMatch(expected, signature)) {
    payment.status = "failed";
    payment.failureReason = "Signature verification failed";
    await payment.save();
    throw new AppError("Payment verification failed. If money was deducted it will be refunded automatically by the bank.", 400);
  }

  const booking = await finalisePaidBooking(payment, { paymentId, signature });
  res.json({ success: true, message: "Payment successful. Booking confirmed!", booking });
}

// POST /api/payments/demo/complete { orderId }  — only in demo mode
export async function completeDemoPayment(req, res) {
  requireFields(req.body, ["orderId"]);
  if (paymentMode() !== "demo") throw new AppError("Demo payments are disabled", 403);
  const payment = await Payment.findOne({ orderId: req.body.orderId, provider: "demo" });
  if (!payment || String(payment.user) !== String(req.user._id)) throw new AppError("Payment order not found", 404);
  if (payment.status === "paid") {
    const booking = await Booking.findById(payment.booking);
    return res.json({ success: true, message: "Payment already completed", booking });
  }
  await loadPendingBooking(payment.booking, req.user); // hold must still be valid
  // Only a method name and a masked label are accepted. Full card numbers are never sent to or stored by the server.
  const METHODS = ["card", "upi", "netbanking", "wallet"];
  if (METHODS.includes(req.body.method)) payment.method = req.body.method;
  const label = String(req.body.methodLabel || "").slice(0, 60);
  if (!/\d{8,}/.test(label)) payment.methodLabel = label; // reject anything that looks like a full card number
  const booking = await finalisePaidBooking(payment, { paymentId: `demo_pay_${crypto.randomBytes(8).toString("hex")}` });
  res.json({ success: true, message: "Demo payment successful. Booking confirmed!", booking });
}

// POST /api/payments/failed { orderId, reason, release? }
// Called when the user closes the checkout or the gateway reports a failure.
// The seat hold stays (so the user can retry) unless release=true.
export async function reportFailure(req, res) {
  requireFields(req.body, ["orderId"]);
  const payment = await Payment.findOne({ orderId: req.body.orderId });
  if (!payment || String(payment.user) !== String(req.user._id)) throw new AppError("Payment order not found", 404);
  if (payment.status === "paid") return res.json({ success: true, message: "Payment already completed" });
  payment.status = "failed";
  payment.failureReason = String(req.body.reason || "Payment cancelled by user").slice(0, 300);
  await payment.save();

  const booking = await Booking.findById(payment.booking);
  if (booking && booking.status === "pending" && req.body.release) {
    booking.status = "failed";
    booking.paymentStatus = "failed";
    booking.cancellationReason = payment.failureReason;
    await booking.save();
    await releaseLocksForBooking(booking.show, booking._id);
  }
  res.json({ success: true, message: "Payment marked as failed", booking });
}

/**
 * Initiates a refund for a booking's captured payment and updates booking.paymentStatus.
 * Caller is responsible for saving the booking.
 */
export async function refundBookingPayment(booking) {
  const payment = booking.payment?._id ? await Payment.findById(booking.payment._id) : await Payment.findById(booking.payment);
  if (!payment || payment.status !== "paid") {
    booking.paymentStatus = booking.paymentStatus === "paid" ? "refund_initiated" : booking.paymentStatus;
    return;
  }
  if (payment.provider === "demo") {
    payment.status = "refunded";
    booking.paymentStatus = "refunded";
  } else {
    payment.status = "refund_initiated";
    booking.paymentStatus = "refund_initiated";
    const rp = getRazorpay();
    if (rp && payment.paymentId) {
      try {
        const refund = await rp.payments.refund(payment.paymentId, { amount: payment.amount, notes: { bookingId: booking.bookingId } });
        payment.refundId = refund.id;
      } catch (err) {
        console.warn("[refund] Razorpay refund failed, needs manual action:", err?.error?.description || err?.message || JSON.stringify(err));
      }
    }
  }
  await payment.save();
}

