import Razorpay from "razorpay";
import { env, isRazorpayConfigured } from "./env.js";

let instance = null;

// Returns a Razorpay SDK client, or null when keys are not configured.
export function getRazorpay() {
  if (!isRazorpayConfigured()) return null;
  if (!instance) instance = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return instance;
}
