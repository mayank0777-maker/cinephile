import { ArrowRight, Building2, MapPin, ShieldCheck, Sparkles, Ticket, Zap } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel";
import MovieRow from "../components/MovieRow";
import TrailerModal from "../components/TrailerModal";
import { useCity } from "../context/CityContext";
import { useAsync } from "../hooks/useAsync";
import { movieApi, theatreApi } from "../services/api";

const GENRE_STYLES = ["from-rose-600/40", "from-violet-600/40", "from-sky-600/40", "from-amber-600/40", "from-emerald-600/40", "from-fuchsia-600/40", "from-orange-600/40", "from-indigo-600/40"];

export default function Home() {
  const [trailer, setTrailer] = useState(null);
  const { city } = useCity();
  const trending = useAsync(() => movieApi.list({ trending: true, status: "now_showing", limit: 6, sort: "latest" }).then((r) => r.items), []);
  const nowShowing = useAsync(() => movieApi.list({ status: "now_showing", limit: 20 }).then((r) => r.items), []);
  const upcoming = useAsync(() => movieApi.list({ status: "upcoming", limit: 20, sort: "oldest" }).then((r) => r.items), []);
  const popular = useAsync(() => movieApi.list({ popular: true, limit: 20, sort: "rating" }).then((r) => r.items), []);
  const filters = useAsync(() => movieApi.filters(), []);
  const theatres = useAsync(() => (city ? theatreApi.list({ city }).then((r) => r.items) : Promise.resolve([])), [city]);

  return (
    <>
      <HeroCarousel movies={trending.data || []} loading={trending.loading} onTrailer={setTrailer} />

      <MovieRow title="Now Showing" subtitle={city ? `In cinemas across ${city}` : "In cinemas now"} items={nowShowing.data} loading={nowShowing.loading} error={nowShowing.error} onRetry={nowShowing.reload} seeAllTo="/movies?status=now_showing" onTrailer={setTrailer} />

      {/* Genre explorer */}
      {filters.data?.genres?.length > 0 && (
        <section className="container-x mt-14">
          <h2 className="section-title mb-5">Explore by genre</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {filters.data.genres.slice(0, 12).map((g, i) => (
              <Link key={g} to={`/movies?genre=${encodeURIComponent(g)}`} className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br ${GENRE_STYLES[i % GENRE_STYLES.length]} to-ink-800 p-4 transition hover:-translate-y-0.5 hover:border-white/15`}>
                <span className="font-display font-semibold text-white">{g}</span>
                <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/40 transition group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <MovieRow title="Coming Soon" subtitle="Add them to your watchlist so you don't miss opening day" items={upcoming.data} loading={upcoming.loading} error={upcoming.error} onRetry={upcoming.reload} seeAllTo="/movies?status=upcoming" onTrailer={setTrailer} />

      {/* Promo band */}
      <section className="container-x mt-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-brand-700/40 via-ink-800 to-violet-800/40 p-8 sm:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-3">
            {[
              [Zap, "Book in seconds", "Pick a show, choose seats on a live map and pay securely."],
              [ShieldCheck, "No double bookings", "Seats are held for you while you pay — nobody else can grab them."],
              [Ticket, "Instant m-ticket", "Get a booking ID immediately. Cancel up to 2 hours before showtime."],
            ].map(([Icon, title, text]) => (
              <div key={title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-300"><Icon className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-display font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MovieRow title="Popular Right Now" subtitle="Audience favourites with top ratings" items={popular.data} loading={popular.loading} error={popular.error} onRetry={popular.reload} seeAllTo="/movies?sort=rating" onTrailer={setTrailer} />

      {/* Cinemas in city */}
      {theatres.data?.length > 0 && (
        <section className="container-x mt-14">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="section-title">Cinemas in {city}</h2>
              <p className="mt-1 text-sm text-slate-400">{theatres.data.length} venues near you</p>
            </div>
            <Link to="/theatres" className="text-sm font-semibold text-brand-400 hover:text-brand-300">View all</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {theatres.data.slice(0, 3).map((t) => (
              <Link key={t._id} to="/theatres" className="card group flex gap-4 p-5 transition hover:border-white/15">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600/30 to-brand-600/30 text-white"><Building2 className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white group-hover:text-brand-300">{t.name}</p>
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-400"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> <span className="line-clamp-2">{t.address}</span></p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.amenities.slice(0, 3).map((a) => <span key={a} className="chip px-2 py-0.5 text-[10px]">{a}</span>)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-x mt-16">
        <div className="card flex flex-col items-center justify-between gap-4 p-8 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-4">
            <Sparkles className="hidden h-10 w-10 text-violet-400 sm:block" />
            <div>
              <h3 className="font-display text-xl font-bold text-white">Can't decide what to watch?</h3>
              <p className="text-sm text-slate-400">Browse every movie by genre and language, or search for your favourite star.</p>
            </div>
          </div>
          <Link to="/movies" className="btn-primary shrink-0">Browse all movies <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <TrailerModal movie={trailer} onClose={() => setTrailer(null)} />
    </>
  );
}
