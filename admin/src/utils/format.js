import { API_URL } from "../services/api";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n) => inr.format(Number(n) || 0);
export const compact = (n) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0);
export const imageUrl = (src) => (!src ? "" : src.startsWith("/uploads/") ? `${API_URL}${src}` : src);
export const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) => (d ? new Date(d).toLocaleDateString("en-IN", opts) : "—");
export const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
export const fmtDateTime = (d) => (d ? `${fmtDate(d, { day: "numeric", month: "short" })}, ${fmtTime(d)}` : "—");
export const duration = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
export const initials = (name = "") => name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");

// "2026-11-05" (local) for <input type="date">
export const toDateInput = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const statusStyle = (s) =>
  ({
    confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    now_showing: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    scheduled: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    upcoming: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    refund_initiated: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    refunded: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    cancelled: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    ended: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    expired: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
  })[s] || "bg-slate-500/15 text-slate-300 border-slate-500/30";
