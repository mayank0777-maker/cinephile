import { ArrowLeft, CalendarX2, ChevronDown, Info, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CertBadge, EmptyState, ErrorState, PageLoader, Poster } from "../components/ui";
import { useCity } from "../context/CityContext";
import { useAsync } from "../hooks/useAsync";
import { movieApi, showApi } from "../services/api";
import { dayKey, duration, fmtTime, money, nextDays } from "../utils/format";

const availabilityStyle = (s) => {
  const ratio = s.availableSeats / s.totalSeats;
  if (s.availableSeats === 0) return { cls: "border-white/5 text-slate-600 cursor-not-allowed line-through", label: "Sold out" };
  if (ratio < 0.15) return { cls: "border-red-500/50 text-red-300 hover:bg-red-500/10", label: "Almost full" };
  if (ratio < 0.5) return { cls: "border-amber-500/50 text-amber-300 hover:bg-amber-500/10", label: "Filling fast" };
  return { cls: "border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10", label: "Available" };
};

export default function ShowTimes() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { city, setPickerOpen } = useCity();
  const days = useMemo(() => nextDays(7), []);
  const [day, setDay] = useState(dayKey(days[0]));
  const [language, setLanguage] = useState("");
  const [format, setFormat] = useState("");

  const movie = useAsync(() => movieApi.get(slug).then((r) => r.movie), [slug]);
  const shows = useAsync(() => {
    if (!movie.data || !city) return Promise.resolve([]);
    const to = new Date(days[days.length - 1]);
    to.setDate(to.getDate() + 1);
    return showApi.list({ movie: movie.data._id, city, from: days[0].toISOString(), to: to.toISOString(), limit: 100 }).then((r) => r.items);
  }, [movie.data?._id, city]);

  const byDay = useMemo(() => {
    const map = {};
    for (const s of shows.data || []) (map[dayKey(s.startTime)] ||= []).push(s);
    return map;
  }, [shows.data]);

  // jump to the first day that has shows
  useEffect(() => {
    if (!shows.data?.length) return;
    if (!byDay[day]) {
      const first = days.map(dayKey).find((k) => byDay[k]);
      if (first) setDay(first);
    }
  }, [shows.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const dayShows = (byDay[day] || []).filter((s) => (!language || s.language === language) && (!format || s.format === format));
  const languages = [...new Set((shows.data || []).map((s) => s.language))];
  const formats = [...new Set((shows.data || []).map((s) => s.format))];
  const theatres = useMemo(() => {
    const map = new Map();
    for (const s of dayShows) {
      const id = s.theatre._id;
      if (!map.has(id)) map.set(id, { theatre: s.theatre, shows: [] });
      map.get(id).shows.push(s);
    }
    return [...map.values()].sort((a, b) => a.theatre.name.localeCompare(b.theatre.name));
  }, [dayShows]);

  if (movie.loading) return <PageLoader />;
  if (movie.error) return <div className="container-x pt-10"><ErrorState error={movie.error} onRetry={movie.reload} /></div>;
  const m = movie.data;

  return (
    <div className="container-x pt-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</button>

      <div className="card flex items-center gap-4 p-4 sm:p-5">
        <Poster src={m.poster} title={m.title} className="h-24 w-16 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/movie/${m.slug}`} className="font-display text-xl font-bold text-white hover:text-brand-300 sm:text-2xl">{m.title}</Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <CertBadge cert={m.certificate} /> <span>{duration(m.duration)}</span> <span>·</span> <span>{m.genres.join(", ")}</span>
          </div>
        </div>
        <button onClick={() => setPickerOpen(true)} className="btn-ghost btn-sm hidden sm:inline-flex"><MapPin className="h-3.5 w-3.5 text-brand-400" /> {city || "Select city"} <ChevronDown className="h-3 w-3" /></button>
      </div>

      {m.status === "upcoming" ? (
        <div className="mt-8"><EmptyState icon={CalendarX2} title="Bookings open soon" message="This movie hasn't released yet. Add it to your watchlist and check back closer to the release date." /></div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {days.map((d) => {
                const k = dayKey(d);
                const has = Boolean(byDay[k]);
                const active = k === day;
                return (
                  <button key={k} disabled={!has && !shows.loading} onClick={() => setDay(k)} className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 transition ${active ? "border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-600/30" : has ? "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25" : "border-white/5 text-slate-600"}`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    <span className="font-display text-xl font-bold leading-tight">{d.getDate()}</span>
                    <span className="text-[10px] uppercase opacity-70">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input w-auto py-2 text-xs" aria-label="Filter by language">
                <option value="">All languages</option>
                {languages.map((l) => <option key={l}>{l}</option>)}
              </select>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="input w-auto py-2 text-xs" aria-label="Filter by format">
                <option value="">All formats</option>
                {formats.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Filling fast</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> Almost full</span>
          </div>

          <div className="mt-6 space-y-4">
            {shows.loading ? (
              [0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)
            ) : shows.error ? (
              <ErrorState error={shows.error} onRetry={shows.reload} />
            ) : !city ? (
              <EmptyState icon={MapPin} title="Choose your city" message="Select a city to see cinemas and showtimes." action={<button onClick={() => setPickerOpen(true)} className="btn-primary btn-sm">Select city</button>} />
            ) : !theatres.length ? (
              <EmptyState icon={CalendarX2} title={`No shows in ${city}`} message={shows.data?.length ? "No shows match these filters on this day. Try another date, language or format." : "This movie isn't playing in your city this week. Try another city."} action={<button onClick={() => setPickerOpen(true)} className="btn-ghost btn-sm">Change city</button>} />
            ) : (
              theatres.map(({ theatre, shows: list }) => (
                <div key={theatre._id} className="card p-5 animate-slide-up">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{theatre.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" /> {theatre.address}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">{theatre.amenities.slice(0, 3).map((a) => <span key={a} className="chip px-2 py-0.5 text-[10px]">{a}</span>)}</div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {list.map((s) => {
                      const st = availabilityStyle(s);
                      return (
                        <button
                          key={s._id}
                          disabled={s.availableSeats === 0}
                          onClick={() => navigate(`/show/${s._id}`)}
                          className={`group relative rounded-xl border bg-white/[0.02] px-4 py-2 text-center transition ${st.cls}`}
                        >
                          <span className="block text-sm font-bold">{fmtTime(s.startTime)}</span>
                          <span className="block text-[10px] uppercase tracking-wide text-slate-400">{s.language} · {s.format}</span>
                          <span className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-ink-700 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-xl group-hover:block">
                            {st.label} · {s.availableSeats} seats · {money(s.minPrice)}–{money(s.maxPrice)} · {s.screenName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-500"><Info className="h-3.5 w-3.5" /> Hover a showtime to see prices and seat availability.</p>
        </>
      )}
    </div>
  );
}
