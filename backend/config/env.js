// Central place for every environment variable the API reads.
// Nothing secret is hard-coded: copy .env.example to .env and fill it in.
import "dotenv/config";

const bool = (v, def = false) => (v === undefined || v === "" ? def : ["1", "true", "yes"].includes(String(v).toLowerCase()));
const num = (v, def) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? def : Number(v));

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: num(process.env.PORT, 5000),
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cinephile",
  JWT_SECRET: process.env.JWT_SECRET || "",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CLIENT_URLS: (process.env.CLIENT_URLS || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
  // Lets you demo the full flow without a payment gateway. Ignored whenever Razorpay keys are set.
  ALLOW_DEMO_PAYMENTS: bool(process.env.ALLOW_DEMO_PAYMENTS, false),

  SEAT_LOCK_MINUTES: num(process.env.SEAT_LOCK_MINUTES, 8),
  CONVENIENCE_FEE_PER_TICKET: num(process.env.CONVENIENCE_FEE_PER_TICKET, 25),
  MAX_SEATS_PER_BOOKING: num(process.env.MAX_SEATS_PER_BOOKING, 10),
  CANCELLATION_CUTOFF_HOURS: num(process.env.CANCELLATION_CUTOFF_HOURS, 2),
};

export const isRazorpayConfigured = () => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

// "razorpay" when keys are present, "demo" when explicitly allowed, otherwise "disabled".
export const paymentMode = () => (isRazorpayConfigured() ? "razorpay" : env.ALLOW_DEMO_PAYMENTS ? "demo" : "disabled");

export function assertEnv() {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
    console.error("\n[config] JWT_SECRET is missing or shorter than 16 characters.");
    console.error("[config] Copy backend/.env.example to backend/.env and set a long random JWT_SECRET.\n");
    process.exit(1);
  }
}
