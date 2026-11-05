import { Film, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import MovieCard from "../components/MovieCard";
import TrailerModal from "../components/TrailerModal";
import { EmptyState, ErrorState, MovieCardSkeleton } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { movieApi } from "../services/api";

const STATUS_TABS = [
  ["", "All"],
  ["now_showing", "Now Showing"],
  ["upcoming", "Coming Soon"],
];
const SORTS = [
  ["latest", "Newest first"],
  ["rating", "Top rated"],
  ["popular", "Most popular"],
  ["title", "A – Z"],
];

export default function Movies() {
  const [params, setParams] = useSearchParams();
  const [trailer, setTrailer] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const status = params.get("status") || "";
  const genre = params.get("genre") || "";
  const language = params.get("language") || "";
  const search = params.get("search") || "";
  const sort = params.get("sort") || "latest";
  const page = Number(params.get("page") || 1);

  const filters = useAsync(() => movieApi.filters(), []);
  const list = useAsync(
    () => movieApi.list({ status: status || undefined, genre: genre || undefined, language: language || undefined, search: search || undefined, sort, page, limit: 18 }),
    [status, genre, language, search, sort, page]
  );

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  const clearAll = () => setParams(new URLSearchParams());
  const activeCount = [genre, language, search].filter(Boolean).length;

  const FilterGroup = ({ title, items, value, keyName }) => (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((g) => (
          <button key={g} onClick={() => update(keyName, value === g ? "" : g)} className={`chip transition hover:border-white/25 ${value === g ? "chip-active" : ""}`}>
            {g}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container-x pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{search ? `Results for “${search}”` : "Movies"}</h1>
          <p className="mt-1 text-sm text-slate-400">{list.data ? `${list.data.total} movie${list.data.total === 1 ? "" : "s"}` : "Loading…"}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => update("sort", e.target.value)} className="input w-auto py-2" aria-label="Sort movies">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={() => setShowFilters((s) => !s)} className="btn-ghost lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px]">{activeCount}</span>}
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map(([v, l]) => (
          <button key={v} onClick={() => update("status", v)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${status === v ? "bg-white text-ink-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>{l}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
          <div className="card sticky top-24 space-y-6 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-white">Filters</h2>
              {activeCount > 0 && <button onClick={clearAll} className="flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300"><X className="h-3 w-3" /> Clear all</button>}
            </div>
            {search && (
              <div>
                <p className="label">Search</p>
                <button onClick={() => update("search", "")} className="chip chip-active">{search} <X className="h-3 w-3" /></button>
              </div>
            )}
            {filters.data && <FilterGroup title="Genre" items={filters.data.genres} value={genre} keyName="genre" />}
            {filters.data && <FilterGroup title="Language" items={filters.data.languages} value={language} keyName="language" />}
            {filters.loading && <div className="space-y-2"><div className="skeleton h-6 w-full" /><div className="skeleton h-6 w-2/3" /></div>}
          </div>
        </aside>

        <div>
          {list.error ? (
            <ErrorState error={list.error} onRetry={list.reload} />
          ) : list.loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <MovieCardSkeleton key={i} />)}</div>
          ) : !list.data.items.length ? (
            <EmptyState icon={Film} title="No movies found" message="Try removing a filter or searching for something else." action={<button onClick={clearAll} className="btn-ghost btn-sm">Clear filters</button>} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
                {list.data.items.map((m) => <MovieCard key={m._id} movie={m} onTrailer={setTrailer} />)}
              </div>
              {list.data.pages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button disabled={page <= 1} onClick={() => update("page", String(page - 1))} className="btn-ghost btn-sm">Previous</button>
                  <span className="px-3 text-sm text-slate-400">Page {page} of {list.data.pages}</span>
                  <button disabled={page >= list.data.pages} onClick={() => update("page", String(page + 1))} className="btn-ghost btn-sm">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <TrailerModal movie={trailer} onClose={() => setTrailer(null)} />
    </div>
  );
}
