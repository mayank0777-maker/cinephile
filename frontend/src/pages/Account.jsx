import { CalendarDays, ChevronRight, Heart, KeyRound, MapPin, Ticket, User } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import { EmptyState, ErrorState, Poster, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";
import { useAsync } from "../hooks/useAsync";
import { authApi, bookingApi, tokenStore, userApi } from "../services/api";
import { fmtDate, fmtDateTime, initials, money, statusStyle } from "../utils/format";

const TABS = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
  ["cancelled", "Cancelled"],
];

function BookingCard({ b }) {
  const s = b.snapshot;
  return (
    <Link to={`/booking/${b.bookingId}`} className="card group flex gap-4 p-4 transition hover:border-white/15">
      <Poster src={s.poster} title={s.movieTitle} className="h-28 w-[4.7rem] shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate font-semibold text-white group-hover:text-brand-300">{s.movieTitle}</h3>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyle(b.status)}`}>{b.status}</span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" /> {fmtDateTime(s.startTime)}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 shrink-0" /> {s.theatreName} · {s.screenName}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-300">{b.seats.map((x) => x.seatId).join(", ")} · <span className="font-semibold text-white">{money(b.totalAmount)}</span></p>
          <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-white" />
        </div>
        <p className="mt-1 font-mono text-[10px] text-slate-500">{b.bookingId}</p>
      </div>
    </Link>
  );
}

function Bookings() {
  const [tab, setTab] = useState("upcoming");
  const { data, loading, error, reload } = useAsync(() => bookingApi.mine(tab).then((r) => r.items), [tab]);
  return (
    <div>
      <div className="mb-5 flex gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === v ? "bg-white text-ink-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>{l}</button>
        ))}
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-36" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data.length ? (
        <EmptyState icon={Ticket} title={tab === "upcoming" ? "No upcoming shows" : tab === "past" ? "No past bookings" : "No cancelled bookings"} message={tab === "upcoming" ? "Your next movie night is just a few clicks away." : undefined} action={tab === "upcoming" && <Link to="/movies?status=now_showing" className="btn-primary btn-sm">Book a movie</Link>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{data.map((b) => <BookingCard key={b._id} b={b} />)}</div>
      )}
    </div>
  );
}

function Watchlist() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => userApi.watchlist().then((r) => r.items), [user?.watchlist?.length]);
  if (loading) return <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-[2/3]" />)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.length) return <EmptyState icon={Heart} title="Your watchlist is empty" message="Tap the heart on any movie to save it here." action={<Link to="/movies" className="btn-primary btn-sm">Discover movies</Link>} />;
  return <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{data.map((m) => <MovieCard key={m._id} movie={m} />)}</div>;
}

function Profile() {
  const { user, updateUser } = useAuth();
  const { cities } = useCity();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "", city: user.city || "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authApi.update(form);
      updateUser(res.user);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  const changePw = async (e) => {
    e.preventDefault();
    setSavingPw(true);
    try {
      const res = await authApi.changePassword(pw);
      tokenStore.set(res.token);
      setPw({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="card space-y-4 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><User className="h-5 w-5 text-brand-400" /> Personal details</h3>
        <div><label className="label">Full name</label><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label">Email</label><input className="input opacity-60" value={user.email} disabled /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98xxxxxxxx" /></div>
        <div>
          <label className="label">Preferred city</label>
          <select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
            <option value="">Not set</option>
            {cities.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn-primary" disabled={saving}>{saving && <Spinner className="h-4 w-4" />} Save changes</button>
      </form>
      <form onSubmit={changePw} className="card h-fit space-y-4 p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><KeyRound className="h-5 w-5 text-brand-400" /> Change password</h3>
        <div><label className="label">Current password</label><input type="password" className="input" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" /></div>
        <div><label className="label">New password</label><input type="password" className="input" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" /></div>
        <button className="btn-ghost" disabled={savingPw}>{savingPw && <Spinner className="h-4 w-4" />} Update password</button>
      </form>
    </div>
  );
}

export default function Account() {
  const { tab = "bookings" } = useParams();
  const { user } = useAuth();
  const upcoming = useAsync(() => bookingApi.mine("upcoming").then((r) => r.items.length), []);
  if (!["bookings", "watchlist", "profile"].includes(tab)) return <Navigate to="/account/bookings" replace />;
  const link = ({ isActive }) => `flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition ${isActive ? "border-brand-500 text-white" : "border-transparent text-slate-400 hover:text-white"}`;

  return (
    <div className="container-x pt-8">
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 font-display text-2xl font-bold text-white">{initials(user.name)}</span>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-sm text-slate-400">{user.email} · Member since {fmtDate(user.createdAt, { month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex gap-6">
            <div><p className="font-display text-2xl font-bold text-white">{upcoming.data ?? "–"}</p><p className="text-xs text-slate-400">Upcoming shows</p></div>
            <div><p className="font-display text-2xl font-bold text-white">{user.watchlist?.length || 0}</p><p className="text-xs text-slate-400">In watchlist</p></div>
          </div>
        </div>
      </div>

      <nav className="mt-8 flex gap-6 border-b border-white/5">
        <NavLink to="/account/bookings" className={link}><Ticket className="h-4 w-4" /> Bookings</NavLink>
        <NavLink to="/account/watchlist" className={link}><Heart className="h-4 w-4" /> Watchlist</NavLink>
        <NavLink to="/account/profile" className={link}><User className="h-4 w-4" /> Profile</NavLink>
      </nav>
      <div className="mt-6">
        {tab === "bookings" && <Bookings />}
        {tab === "watchlist" && <Watchlist />}
        {tab === "profile" && <Profile />}
      </div>
    </div>
  );
}
