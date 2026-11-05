import { Clock, Heart, Play, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { duration, imageUrl } from "../utils/format";
import { CertBadge, Rating } from "./ui";

export default function HeroCarousel({ movies = [], loading, onTrailer }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const { inWatchlist, toggleWatchlist } = useAuth();

  useEffect(() => {
    if (paused || movies.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % movies.length), 6500);
    return () => clearInterval(t);
  }, [paused, movies.length]);

  if (loading) return <div className="skeleton h-[78vh] min-h-[520px] w-full rounded-none" />;
  if (!movies.length) return null;
  const m = movies[index];
  const bg = imageUrl(m.backdrop || m.poster);

  return (
    <section className="relative -mt-16 h-[82vh] min-h-[560px] w-full overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {movies.map((mv, i) => (
        <img
          key={mv._id}
          src={imageUrl(mv.backdrop || mv.poster)}
          alt=""
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ${i === index ? "scale-100 opacity-100" : "scale-105 opacity-0"} ${!mv.backdrop ? "object-top blur-sm" : ""}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/75 to-ink-900/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-ink-900/40" />

      <div className="container-x relative flex h-full items-end pb-20 sm:items-center sm:pb-0">
        <div key={m._id} className="max-w-2xl pt-16 animate-slide-up">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-600/90 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">#{index + 1} Trending</span>
            <CertBadge cert={m.certificate} />
            <Rating value={m.rating} />
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-xl sm:text-6xl lg:text-7xl">{m.title}</h1>
          {m.tagline && <p className="mt-3 text-lg italic text-slate-300">“{m.tagline}”</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" />{duration(m.duration)}</span>
            <span>{m.genres.join(" · ")}</span>
            <span className="text-slate-400">{m.languages.join(", ")}</span>
          </div>
          <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{m.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to={`/movie/${m.slug}/shows`} className="btn-primary px-6 py-3 text-base"><Ticket className="h-5 w-5" /> Book tickets</Link>
            {m.trailerUrl && (
              <button onClick={() => onTrailer(m)} className="btn-ghost px-6 py-3 text-base"><Play className="h-5 w-5 fill-white" /> Trailer</button>
            )}
            <button onClick={() => toggleWatchlist(m._id)} className="btn-ghost h-12 w-12 !px-0" aria-label="Toggle watchlist">
              <Heart className={`h-5 w-5 ${inWatchlist(m._id) ? "fill-brand-500 text-brand-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2 sm:left-auto sm:right-8 sm:translate-x-0">
        {movies.map((mv, i) => (
          <button key={mv._id} onClick={() => setIndex(i)} className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-brand-500" : "w-3 bg-white/30 hover:bg-white/60"}`} aria-label={`Show ${mv.title}`} />
        ))}
      </div>
      <link rel="preload" as="image" href={bg} />
    </section>
  );
}
