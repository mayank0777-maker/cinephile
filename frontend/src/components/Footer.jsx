import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useCity } from "../context/CityContext";
import Logo from "./Logo";

export default function Footer() {
  const { cities, setCity } = useCity();
  return (
    <footer className="mt-24 border-t border-white/5 bg-ink-950/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-slate-400">
            Discover what's playing, pick the perfect seat and get your tickets in seconds. Your night at the movies starts here.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Explore</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link className="text-slate-300 hover:text-white" to="/movies?status=now_showing">Now showing</Link></li>
            <li><Link className="text-slate-300 hover:text-white" to="/movies?status=upcoming">Coming soon</Link></li>
            <li><Link className="text-slate-300 hover:text-white" to="/theatres">Cinemas near you</Link></li>
            <li><Link className="text-slate-300 hover:text-white" to="/account/bookings">My tickets</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Cities</h4>
          <ul className="grid grid-cols-2 gap-2.5 text-sm">
            {cities.map((c) => (
              <li key={c}>
                <Link to="/theatres" onClick={() => setCity(c)} className="text-slate-300 hover:text-white">{c}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Support</h4>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" /> support@cinephile.app</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" /> 1800-000-CINE</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /> Mumbai, India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Cinephile. A MERN stack project.</p>
          <p>Movie artwork via TMDB for demonstration purposes.</p>
        </div>
      </div>
    </footer>
  );
}
