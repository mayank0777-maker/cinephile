import { Building2, CalendarClock, ExternalLink, Film, LayoutDashboard, LogOut, Menu, Ticket, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAdmin } from "../context/AuthContext";
import { initials } from "../utils/format";
import { LogoMark, Wordmark } from "./Wordmark";

const NAV = [
  ["/", "Dashboard", LayoutDashboard],
  ["/movies", "Movies", Film],
  ["/theatres", "Theatres", Building2],
  ["/shows", "Shows", CalendarClock],
  ["/bookings", "Bookings", Ticket],
  ["/users", "Users", Users],
];

export default function Layout() {
  const { admin, logout } = useAdmin();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <LogoMark className="h-9 w-auto" />
        <div>
          <Wordmark className="text-xl" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-400">Admin</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-gradient-to-r from-brand-600/25 to-transparent text-white ring-1 ring-brand-500/30" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
        <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" /> Open customer site
        </a>
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-brand-600 text-xs font-bold text-white">{initials(admin?.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{admin?.name}</p>
          <p className="truncate text-[11px] text-slate-500">{admin?.email}</p>
        </div>
        <button onClick={logout} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Log out" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/5 bg-ink-850/95 backdrop-blur lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-white/5 bg-ink-850 animate-fade-in">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10" aria-label="Close menu"><X className="h-4 w-4" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/5 bg-ink-900/85 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/5" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <LogoMark className="h-7 w-auto" />
        <Wordmark className="text-lg" />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
