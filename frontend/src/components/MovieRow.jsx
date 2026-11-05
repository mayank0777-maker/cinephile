import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import MovieCard from "./MovieCard";
import { EmptyState, ErrorState, MovieCardSkeleton } from "./ui";

// Horizontally scrolling row of movie cards with arrow controls.
export default function MovieRow({ title, subtitle, items, loading, error, onRetry, seeAllTo, onTrailer, emptyText = "Nothing here yet." }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="container-x mt-14">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {seeAllTo && <Link to={seeAllTo} className="mr-1 text-sm font-semibold text-brand-400 hover:text-brand-300">See all</Link>}
          <button onClick={() => scroll(-1)} className="hidden h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:grid" aria-label="Scroll left"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => scroll(1)} className="hidden h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:grid" aria-label="Scroll right"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : !loading && !items?.length ? (
        <EmptyState title="No movies to show" message={emptyText} />
      ) : (
        <div ref={ref} className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:gap-5">
          {(loading ? Array.from({ length: 6 }) : items).map((m, i) => (
            <div key={m?._id || i} className="w-[42vw] shrink-0 snap-start sm:w-[200px] lg:w-[210px]">
              {loading ? <MovieCardSkeleton /> : <MovieCard movie={m} onTrailer={onTrailer} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
