import { ChevronDown, Heart, LogOut, MapPin, Menu, Search, Ticket, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCity } from "../context/CityContext";
import { useDebounce } from "../hooks/useAsync";
import { movieApi } from "../services/api";
import { initials } from "../utils/format";
import Logo from "./Logo";
import { Poster, Spinner } from "./ui";

function SearchBox({ onDone, autoFocus = false }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(q, 250);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    movieApi
      .list({ search: debounced, limit: 6 })
      .then((r) => setResults(r.items))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/movies?search=${encodeURIComponent(q.trim())}`);
    setOpen(false);
    onDone?.();
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search movies, actors, genres…"
          className="input rounded-full bg-white/5 py-2 pl-10"
          aria-label="Search movies"
        />
      </form>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-2xl shadow-black/60 animate-fade-in">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-slate-400"><Spinner className="h-4 w-4" /> Searching…</div>
          ) : results.length ? (
            <ul>
              {results.map((m) => (
                <li key={m._id}>
                  <Link to={`/movie/${m.slug}`} onClick={() => { setOpen(false); setQ(""); onDone?.(); }} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5">
                    <Poster src={m.poster} title={m.title} className="h-14 w-10 rounded-md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{m.title}</p>
                      <p className="truncate text-xs text-slate-400">{m.genres.join(" · ")}</p>
                    </div>
                    {m.status === "upcoming" && <span className="ml-auto chip text-[10px]">Coming soon</span>}
                  </Link>
                </li>
              ))}
              <li>
                <button onClick={submit} className="w-full border-t border-white/5 px-4 py-2.5 text-left text-xs font-semibold text-brand-400 hover:bg-white/5">
                  See all results for “{q}”
                </button>
              </li>
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-400">No movies match “{q}”.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { city, setPickerOpen } = useCity();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const link = ({ isActive }) => `text-sm font-medium transition ${isActive ? "text-white" : "text-slate-400 hover:text-white"}`;

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/5 bg-ink-900/85 backdrop-blur-xl" : "bg-gradient-to-b from-ink-900/90 to-transparent"}`}>
      <div className="container-x flex h-16 items-center gap-4">
        <Logo />
        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/movies" className={link}>Movies</NavLink>
          <NavLink to="/theatres" className={link}>Cinemas</NavLink>
          {user && <NavLink to="/account/bookings" className={link}>My Tickets</NavLink>}
        </nav>

        <div className="ml-auto hidden max-w-sm flex-1 md:block">
          <SearchBox />
        </div>

        <button onClick={() => setPickerOpen(true)} className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:flex" aria-label="Change city">
          <MapPin className="h-4 w-4 text-brand-400" />
          {city || "Select city"}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>

        {user ? (
          <div className="relative hidden sm:block" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 transition hover:bg-white/10" aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">{initials(user.name)}</span>
              <span className="max-w-[90px] truncate text-sm font-medium text-white">{user.name.split(" ")[0]}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl shadow-black/60 animate-fade-in" role="menu">
                <div className="border-b border-white/5 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                </div>
                <Link to="/account/bookings" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><Ticket className="h-4 w-4" /> My bookings</Link>
                <Link to="/account/watchlist" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><Heart className="h-4 w-4" /> Watchlist</Link>
                <Link to="/account/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><User className="h-4 w-4" /> Profile</Link>
                <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><LogOut className="h-4 w-4" /> Log out</button>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/login" state={{ from: location.pathname }} className="btn-ghost btn-sm">Log in</Link>
            <Link to="/register" className="btn-primary btn-sm">Sign up</Link>
          </div>
        )}

        <button className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-slate-200 hover:bg-white/5 sm:ml-0 lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/5 bg-ink-900/95 backdrop-blur-xl lg:hidden animate-fade-in">
          <div className="container-x flex flex-col gap-1 py-4">
            <div className="mb-3 md:hidden"><SearchBox onDone={() => setMobileOpen(false)} /></div>
            <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 sm:hidden">
              <MapPin className="h-4 w-4 text-brand-400" /> {city || "Select city"}
            </button>
            {[["/", "Home"], ["/movies", "Movies"], ["/theatres", "Cinemas"]].map(([to, label]) => (
              <NavLink key={to} to={to} end className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">{label}</NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/account/bookings" className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">My bookings</NavLink>
                <NavLink to="/account/watchlist" className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">Watchlist</NavLink>
                <NavLink to="/account/profile" className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5">Profile</NavLink>
                <button onClick={logout} className="rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/10">Log out</button>
              </>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                <Link to="/login" className="btn-ghost">Log in</Link>
                <Link to="/register" className="btn-primary">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
