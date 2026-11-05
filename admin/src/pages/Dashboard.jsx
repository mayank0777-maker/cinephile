import { Building2, CalendarClock, Film, IndianRupee, Ticket, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, ErrorState, PageHeader, PageLoader, Thumb } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { adminApi } from "../services/api";
import { compact, fmtDate, fmtDateTime, money } from "../utils/format";

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-200"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

// Dependency-free SVG bar chart of daily revenue with hover tooltips.
function RevenueChart({ series }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...series.map((d) => d.revenue));
  const W = 700;
  const H = 220;
  const pad = { l: 48, r: 8, t: 12, b: 28 };
  const bw = (W - pad.l - pad.r) / series.length;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Daily revenue chart">
        <defs>
          <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fb7185" />
            <stop offset="1" stopColor="#be123c" />
          </linearGradient>
        </defs>
        {ticks.map((t) => {
          const y = pad.t + (H - pad.t - pad.b) * (1 - t / max);
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={pad.l - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px]">₹{compact(t)}</text>
            </g>
          );
        })}
        {series.map((d, i) => {
          const h = ((H - pad.t - pad.b) * d.revenue) / max;
          const x = pad.l + i * bw + bw * 0.18;
          const y = H - pad.b - h;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <rect x={x} y={y} width={bw * 0.64} height={Math.max(h, d.revenue ? 2 : 0)} rx="4" fill="url(#bar)" opacity={hover === null || hover === i ? 1 : 0.45} />
              {(i % Math.ceil(series.length / 7) === 0 || i === series.length - 1) && (
                <text x={x + bw * 0.32} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{fmtDate(d.date, { day: "numeric", month: "short" })}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg border border-white/10 bg-ink-700 px-3 py-2 text-xs shadow-xl" style={{ left: `${((hover + 0.5) / series.length) * 100}%`, transform: "translateX(-50%)" }}>
          <p className="font-semibold text-white">{money(series[hover].revenue)}</p>
          <p className="text-slate-400">{series[hover].bookings} bookings · {fmtDate(series[hover].date, { weekday: "short", day: "numeric", month: "short" })}</p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(() => adminApi.stats(), []);
  if (loading) return <PageLoader label="Crunching the numbers…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { totals, revenueSeries, topMovies, revenueByCity, recentBookings, statusCounts } = data;
  const periodRevenue = revenueSeries.reduce((n, d) => n + d.revenue, 0);
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1;
  const cityMax = Math.max(1, ...revenueByCity.map((c) => c.revenue));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live overview of your cinema business" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={IndianRupee} label="Total revenue" value={money(totals.revenue)} sub={`${money(periodRevenue)} in the last ${revenueSeries.length} days`} accent="bg-brand-500/25" />
        <StatCard icon={Ticket} label="Bookings" value={compact(totals.bookings)} sub={`${totals.confirmedBookings} confirmed · ${totals.ticketsSold} tickets sold`} accent="bg-violet-500/25" />
        <StatCard icon={Users} label="Customers" value={compact(totals.users)} sub="Registered users" accent="bg-sky-500/25" />
        <StatCard icon={Film} label="Movies" value={totals.movies} sub="Now showing + upcoming" accent="bg-amber-500/25" />
        <StatCard icon={Building2} label="Theatres" value={totals.theatres} sub="Active venues" accent="bg-emerald-500/25" />
        <StatCard icon={CalendarClock} label="Upcoming shows" value={compact(totals.upcomingShows)} sub="Scheduled and bookable" accent="bg-fuchsia-500/25" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">Revenue overview</h2>
            <span className="text-xs text-slate-500">Last {revenueSeries.length} days (confirmed bookings)</span>
          </div>
          <RevenueChart series={revenueSeries} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-display font-semibold text-white">Booking status</h2>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-white/5">
            {["confirmed", "cancelled", "pending", "expired", "failed"].map((s, i) => statusCounts[s] ? <div key={s} style={{ width: `${(statusCounts[s] / statusTotal) * 100}%` }} className={["bg-emerald-500", "bg-slate-500", "bg-amber-500", "bg-slate-700", "bg-red-500"][i]} title={`${s}: ${statusCounts[s]}`} /> : null)}
          </div>
          <ul className="space-y-2 text-sm">
            {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <li key={s} className="flex items-center justify-between"><Badge value={s} /><span className="font-semibold text-white">{n}</span></li>
            ))}
          </ul>
          <h2 className="mb-3 mt-6 font-display font-semibold text-white">Revenue by city</h2>
          <ul className="space-y-3">
            {revenueByCity.map((c) => (
              <li key={c._id}>
                <div className="mb-1 flex justify-between text-xs"><span className="text-slate-300">{c._id}</span><span className="font-semibold text-white">{money(c.revenue)}</span></div>
                <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-brand-500" style={{ width: `${(c.revenue / cityMax) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display font-semibold text-white">Top movies by revenue</h2>
          <ul className="space-y-3">
            {topMovies.map((m, i) => (
              <li key={m._id} className="flex items-center gap-3">
                <span className="w-5 text-center font-display font-bold text-slate-500">{i + 1}</span>
                <Thumb src={m.poster} title={m.title} className="h-12 w-8" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{m.title}</p><p className="text-xs text-slate-500">{m.tickets} tickets</p></div>
                <span className="text-sm font-semibold text-white">{money(m.revenue)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">Recent bookings</h2>
            <Link to="/bookings" className="text-xs font-semibold text-brand-400 hover:text-brand-300">View all</Link>
          </div>
          <ul className="divide-y divide-white/5">
            {recentBookings.map((b) => (
              <li key={b._id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{b.snapshot.movieTitle}</p>
                  <p className="truncate text-xs text-slate-500">{b.user?.name || "Deleted user"} · {b.snapshot.theatreName} · {fmtDateTime(b.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{money(b.totalAmount)}</p>
                  <Badge value={b.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
