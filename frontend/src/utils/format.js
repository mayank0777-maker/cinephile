import { API_URL } from "../services/api";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const money = (n) => inr.format(Number(n) || 0);

// Uploaded files are stored as "/uploads/x.jpg" on the API server.
export const imageUrl = (src) => (!src ? "" : src.startsWith("/uploads/") ? `${API_URL}${src}` : src);

export const duration = (mins) => {
  const m = Number(mins) || 0;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

export const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) => new Date(d).toLocaleDateString("en-IN", opts);
export const fmtTime = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
export const fmtDateTime = (d) => `${fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(d)}`;

export const youtubeId = (url) => {
  const m = String(url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
};

// Local calendar-day key (YYYY-MM-DD) in the viewer's timezone.
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const nextDays = (n = 7) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

export const certificateColor = (c) =>
  ({ U: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", UA: "bg-amber-500/15 text-amber-300 border-amber-500/30", A: "bg-red-500/15 text-red-300 border-red-500/30" })[c] ||
  "bg-slate-500/15 text-slate-300 border-slate-500/30";

export const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export const statusStyle = (s) =>
  ({
    confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    cancelled: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    expired: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  })[s] || "bg-slate-500/15 text-slate-300 border-slate-500/30";
