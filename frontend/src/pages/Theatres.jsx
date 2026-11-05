import { Building2, ChevronDown, MapPin, Monitor } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, Poster } from "../components/ui";
import { useCity } from "../context/CityContext";
import { useAsync } from "../hooks/useAsync";
import { showApi, theatreApi } from "../services/api";
import { fmtTime } from "../utils/format";

// Today's lineup for one theatre, grouped by movie.
function TheatreShows({ theatreId }) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { data, loading, error } = useAsync(() => showApi.list({ theatre: theatreId, to: end.toISOString() }).then((r) => r.items), [theatreId]);
  const byMovie = useMemo(() => {
    const map = new Map();
    for (const s of data || []) {
      if (!map.has(s.movie._id)) map.set(s.movie._id, { movie: s.movie, shows: [] });
      map.get(s.movie._id).shows.push(s);
    }
    return [...map.values()];
  }, [data]);

  if (loading) return <div className="skeleton mt-4 h-20" />;
  if (error) return <p className="mt-4 text-sm text-red-300">{error.message}</p>;
  if (!byMovie.length) return <p className="mt-4 text-sm text-slate-400">No more shows today. Check back tomorrow!</p>;
  return (
    <div className="mt-4 space-y-3">
      {byMovie.map(({ movie, shows }) => (
        <div key={movie._id} className="flex gap-3 rounded-xl bg-white/[0.03] p-3">
          <Poster src={movie.poster} title={movie.title} className="h-16 w-11 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <Link to={`/movie/${movie.slug}`} className="text-sm font-semibold text-white hover:text-brand-300">{movie.title}</Link>
            <div className="mt-2 flex flex-wrap gap-2">
              {shows.map((s) => (
                <Link key={s._id} to={`/show/${s._id}`} className="rounded-lg border border-emerald-500/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10">
                  {fmtTime(s.startTime)} <span className="text-[10px] font-normal text-slate-400">{s.format}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Theatres() {
  const { city, setPickerOpen } = useCity();
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useAsync(() => (city ? theatreApi.list({ city }).then((r) => r.items) : Promise.resolve([])), [city]);

  return (
    <div className="container-x pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Cinemas in {city || "…"}</h1>
          <p className="mt-1 text-sm text-slate-400">Pick a cinema to see what's playing today.</p>
        </div>
        <button onClick={() => setPickerOpen(true)} className="btn-ghost"><MapPin className="h-4 w-4 text-brand-400" /> Change city</button>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data.length ? (
          <EmptyState icon={Building2} title="No cinemas here yet" message="Try a different city." />
        ) : (
          data.map((t) => (
            <div key={t._id} className="card p-5">
              <button onClick={() => setOpen(open === t._id ? null : t._id)} className="flex w-full items-start gap-4 text-left" aria-expanded={open === t._id}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600/30 to-brand-600/30 text-white"><Building2 className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-white">{t.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{t.address}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="chip px-2 py-0.5 text-[10px]"><Monitor className="h-3 w-3" /> {t.screens.length} screens</span>
                    {t.amenities.map((a) => <span key={a} className="chip px-2 py-0.5 text-[10px]">{a}</span>)}
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open === t._id ? "rotate-180" : ""}`} />
              </button>
              {open === t._id && <TheatreShows theatreId={t._id} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
