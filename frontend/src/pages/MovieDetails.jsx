import { CalendarDays, Clock, Globe, Heart, MessageSquare, Play, Share2, Star, Ticket, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import TrailerModal from "../components/TrailerModal";
import { CertBadge, EmptyState, ErrorState, PageLoader, Poster, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { movieApi } from "../services/api";
import { duration, fmtDate, imageUrl, initials } from "../utils/format";

function PersonCard({ p }) {
  return (
    <div className="w-28 shrink-0 text-center">
      {p.image ? (
        <img src={imageUrl(p.image)} alt={p.name} className="mx-auto h-24 w-24 rounded-full object-cover ring-2 ring-white/10" />
      ) : (
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-ink-600 to-ink-700 font-display text-xl font-bold text-slate-300 ring-2 ring-white/10">{initials(p.name)}</div>
      )}
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">{p.name}</p>
      <p className="line-clamp-2 text-xs text-slate-400">{p.role}</p>
    </div>
  );
}

function Reviews({ movie }) {
  const { user } = useAuth();
  const reviews = useAsync(() => movieApi.reviews(movie._id, { limit: 20 }), [movie._id, user?._id]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const mine = reviews.data?.mine;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error("Pick a rating from 1 to 10");
    setSaving(true);
    try {
      await movieApi.review(movie._id, { rating, comment });
      toast.success("Review posted");
      setRating(0);
      setComment("");
      reviews.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await movieApi.deleteReview(id);
      toast.success("Review deleted");
      reviews.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="section-title">Audience reviews</h2>
        {movie.userRating?.count > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-slate-300"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> <b className="text-white">{movie.userRating.average}/10</b> from {movie.userRating.count} ratings</span>
        )}
      </div>

      {movie.status !== "upcoming" && (
        user ? (
          <form onSubmit={submit} className="card mb-6 p-5">
            <p className="mb-3 text-sm font-semibold text-white">{mine ? "Update your review" : "Rate this movie"}</p>
            <div className="mb-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Rating out of 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} out of 10`} className={`h-9 w-9 rounded-lg border text-sm font-bold transition ${n <= rating ? "border-amber-400/60 bg-amber-400/20 text-amber-200" : "border-white/10 text-slate-400 hover:border-white/25"}`}>{n}</button>
              ))}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={600} rows={3} placeholder={mine ? mine.comment : "What did you think? (optional)"} className="input resize-none" />
            <div className="mt-3 flex justify-end">
              <button className="btn-primary btn-sm" disabled={saving}>{saving && <Spinner className="h-3.5 w-3.5" />} {mine ? "Update review" : "Post review"}</button>
            </div>
          </form>
        ) : (
          <div className="card mb-6 flex items-center justify-between gap-4 p-5">
            <p className="text-sm text-slate-300">Seen it? Share your rating with other movie-goers.</p>
            <Link to="/login" state={{ from: `/movie/${movie.slug}` }} className="btn-ghost btn-sm shrink-0">Log in to review</Link>
          </div>
        )
      )}

      {reviews.loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-28" />)}</div>
      ) : reviews.error ? (
        <ErrorState error={reviews.error} onRetry={reviews.reload} />
      ) : !reviews.data.items.length ? (
        <EmptyState icon={MessageSquare} title="No reviews yet" message={movie.status === "upcoming" ? "Reviews open once the movie releases." : "Be the first to share what you thought."} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.data.items.map((r) => (
            <article key={r._id} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-brand-600 text-xs font-bold text-white">{initials(r.user?.name || "?")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{r.user?.name || "Former user"}</p>
                  <p className="text-xs text-slate-500">{fmtDate(r.createdAt)}</p>
                </div>
                <span className="flex items-center gap-1 rounded-lg bg-amber-400/10 px-2 py-1 text-sm font-bold text-amber-300"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{r.rating}/10</span>
                {user && r.user?._id === user._id && (
                  <button onClick={() => remove(r._id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Delete my review"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
              {r.comment && <p className="mt-3 text-sm leading-relaxed text-slate-300">{r.comment}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MovieDetails() {
  const { slug } = useParams();
  const [trailer, setTrailer] = useState(null);
  const { inWatchlist, toggleWatchlist } = useAuth();
  const { data, loading, error, reload } = useAsync(() => movieApi.get(slug), [slug]);

  if (loading) return <PageLoader />;
  if (error) return <div className="container-x pt-10"><ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} /></div>;
  const m = data.movie;
  const upcoming = m.status === "upcoming";
  const saved = inWatchlist(m._id);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: m.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user cancelled */ }
  };

  return (
    <>
      <section className="relative -mt-16 overflow-hidden">
        <img src={imageUrl(m.backdrop || m.poster)} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover ${m.backdrop ? "" : "scale-110 blur-2xl"}`} />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
        <div className="container-x relative grid gap-8 pb-14 pt-28 md:grid-cols-[280px_1fr] md:items-end">
          <div className="relative mx-auto w-52 md:mx-0 md:w-full">
            <Poster src={m.poster} title={m.title} className="aspect-[2/3] w-full rounded-2xl shadow-2xl shadow-black/70 ring-1 ring-white/10" />
            {m.trailerUrl && (
              <button onClick={() => setTrailer(m)} className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-xl bg-black/60 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-brand-600">
                <Play className="h-4 w-4 fill-white" /> Watch trailer
              </button>
            )}
          </div>
          <div className="animate-slide-up">
            {upcoming && <span className="mb-3 inline-block rounded-full bg-violet-600/90 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">Releasing {fmtDate(m.releaseDate, { day: "numeric", month: "long" })}</span>}
            <h1 className="font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl">{m.title}</h1>
            {m.tagline && <p className="mt-2 text-lg italic text-slate-300">“{m.tagline}”</p>}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {m.rating > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold text-white">{m.rating.toFixed(1)}</span><span className="text-sm text-slate-400">/10</span>
                </div>
              )}
              {m.userRating?.count > 0 && <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 backdrop-blur"><b className="text-white">{m.userRating.average}</b> audience · {m.userRating.count} votes</div>}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
              <CertBadge cert={m.certificate} />
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-500" />{duration(m.duration)}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-500" />{fmtDate(m.releaseDate)}</span>
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-slate-500" />{m.languages.join(", ")}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {m.genres.map((g) => <Link key={g} to={`/movies?genre=${encodeURIComponent(g)}`} className="chip hover:border-white/25">{g}</Link>)}
              {m.formats.map((f) => <span key={f} className="chip border-violet-500/30 text-violet-300">{f}</span>)}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {upcoming ? (
                <button onClick={() => toggleWatchlist(m._id)} className="btn-primary px-6 py-3 text-base"><Heart className={`h-5 w-5 ${saved ? "fill-white" : ""}`} /> {saved ? "In your watchlist" : "Notify me — add to watchlist"}</button>
              ) : (
                <Link to={`/movie/${m.slug}/shows`} className="btn-primary px-7 py-3 text-base"><Ticket className="h-5 w-5" /> Book tickets</Link>
              )}
              {!upcoming && (
                <button onClick={() => toggleWatchlist(m._id)} className="btn-ghost h-12 w-12 !px-0" aria-label="Toggle watchlist"><Heart className={`h-5 w-5 ${saved ? "fill-brand-500 text-brand-500" : ""}`} /></button>
              )}
              <button onClick={share} className="btn-ghost h-12 w-12 !px-0" aria-label="Share"><Share2 className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x">
        <section className="mt-6 max-w-3xl">
          <h2 className="section-title mb-3">About the movie</h2>
          <p className="leading-relaxed text-slate-300">{m.description}</p>
        </section>

        {m.cast?.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-5">Cast</h2>
            <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">{m.cast.map((p) => <PersonCard key={p.name + p.role} p={p} />)}</div>
          </section>
        )}
        {m.crew?.length > 0 && (
          <section className="mt-12">
            <h2 className="section-title mb-5">Crew</h2>
            <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">{m.crew.map((p) => <PersonCard key={p.name + p.role} p={p} />)}</div>
          </section>
        )}

        <Reviews movie={m} />
      </div>
      <TrailerModal movie={trailer} onClose={() => setTrailer(null)} />
    </>
  );
}
