import { Heart, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fmtDate } from "../utils/format";
import { CertBadge, Poster, Rating } from "./ui";

export default function MovieCard({ movie, onTrailer }) {
  const { inWatchlist, toggleWatchlist } = useAuth();
  const saved = inWatchlist(movie._id);
  const upcoming = movie.status === "upcoming";

  return (
    <div className="group relative w-full animate-slide-up">
      <Link to={`/movie/${movie.slug}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-ink-700 ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-brand-500/40 group-hover:shadow-2xl group-hover:shadow-brand-900/40">
          <Poster src={movie.poster} title={movie.title} className="h-full w-full transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80 transition group-hover:opacity-100" />
          <div className="absolute left-2.5 top-2.5 flex gap-1.5">
            {upcoming ? (
              <span className="rounded-md bg-violet-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Soon</span>
            ) : (
              movie.isTrending && <span className="rounded-md bg-brand-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Trending</span>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
            {upcoming ? (
              <span className="text-xs font-medium text-slate-200">{fmtDate(movie.releaseDate, { day: "numeric", month: "short" })}</span>
            ) : (
              <Rating value={movie.rating} />
            )}
            <CertBadge cert={movie.certificate} />
          </div>
          {onTrailer && movie.trailerUrl && (
            <button
              onClick={(e) => { e.preventDefault(); onTrailer(movie); }}
              className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 scale-75 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-md transition group-hover:scale-100 group-hover:opacity-100 hover:bg-brand-600"
              aria-label={`Play ${movie.title} trailer`}
            >
              <Play className="ml-0.5 h-5 w-5 fill-white" />
            </button>
          )}
        </div>
        <h3 className="mt-3 line-clamp-1 font-semibold text-white transition group-hover:text-brand-300">{movie.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{movie.genres?.slice(0, 3).join(" · ")}</p>
      </Link>
      <button
        onClick={() => toggleWatchlist(movie._id)}
        className={`absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition ${saved ? "bg-brand-600 text-white" : "bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60"}`}
        aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-white" : ""}`} />
      </button>
    </div>
  );
}
