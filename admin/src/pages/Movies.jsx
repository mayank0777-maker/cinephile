import { Film, ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Spinner, Thumb } from "../components/ui";
import { useAsync, useDebounce } from "../hooks/useAsync";
import { adminApi } from "../services/api";
import { duration, fmtDate, imageUrl, toDateInput } from "../utils/format";

const EMPTY = {
  title: "", tagline: "", description: "", genres: "", languages: "", formats: "2D", duration: "", releaseDate: toDateInput(new Date()),
  certificate: "UA", rating: "", status: "now_showing", trailerUrl: "", posterUrl: "", backdropUrl: "", isTrending: false, isPopular: false,
  cast: [], crew: [],
};

function PeopleEditor({ label, rolePlaceholder, people, onChange }) {
  const update = (i, k, v) => onChange(people.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <button type="button" onClick={() => onChange([...people, { name: "", role: "", image: "" }])} className="text-xs font-semibold text-brand-400 hover:text-brand-300">+ Add</button>
      </div>
      <div className="space-y-2">
        {people.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <input className="input py-2" placeholder="Name" value={p.name} onChange={(e) => update(i, "name", e.target.value)} />
            <input className="input py-2" placeholder={rolePlaceholder} value={p.role} onChange={(e) => update(i, "role", e.target.value)} />
            <input className="input py-2" placeholder="Photo URL (optional)" value={p.image} onChange={(e) => update(i, "image", e.target.value)} />
            <button type="button" onClick={() => onChange(people.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove"><X className="h-4 w-4" /></button>
          </div>
        ))}
        {!people.length && <p className="text-xs text-slate-500">None added.</p>}
      </div>
    </div>
  );
}

function ImagePicker({ label, file, setFile, url, setUrl, current, aspect }) {
  const [objectUrl, setObjectUrl] = useState("");
  useEffect(() => {
    if (!file) return setObjectUrl("");
    const u = URL.createObjectURL(file);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const preview = objectUrl || (url ? imageUrl(url) : current ? imageUrl(current) : "");
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-3">
        <div className={`${aspect} w-24 shrink-0 overflow-hidden rounded-lg border border-dashed border-white/15 bg-ink-850`}>
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-600"><ImagePlus className="h-6 w-6" /></div>}
        </div>
        <div className="flex-1 space-y-2">
          <label className="btn-ghost btn-sm cursor-pointer">
            <ImagePlus className="h-3.5 w-3.5" /> Upload image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setUrl(""); }} />
          </label>
          {file && <p className="truncate text-xs text-slate-400">{file.name} <button type="button" onClick={() => setFile(null)} className="text-red-300">remove</button></p>}
          <input className="input py-2 text-xs" placeholder="…or paste an image URL" value={url} onChange={(e) => { setUrl(e.target.value); setFile(null); }} />
        </div>
      </div>
    </div>
  );
}

function MovieForm({ movie, onClose, onSaved }) {
  const editing = Boolean(movie?._id);
  const [f, setF] = useState(() =>
    movie
      ? { ...EMPTY, ...movie, genres: movie.genres.join(", "), languages: movie.languages.join(", "), formats: movie.formats.join(", "), releaseDate: toDateInput(movie.releaseDate), posterUrl: "", backdropUrl: "", rating: movie.rating ?? "" }
      : EMPTY
  );
  const [poster, setPoster] = useState(null);
  const [backdrop, setBackdrop] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!editing && !poster && !f.posterUrl) return setError("Please upload a poster or paste a poster URL");
    const fd = new FormData();
    ["title", "tagline", "description", "genres", "languages", "formats", "duration", "releaseDate", "certificate", "rating", "status", "trailerUrl", "isTrending", "isPopular"].forEach((k) => fd.append(k, f[k]));
    fd.append("cast", JSON.stringify(f.cast));
    fd.append("crew", JSON.stringify(f.crew));
    if (poster) fd.append("poster", poster);
    else if (f.posterUrl) fd.append("posterUrl", f.posterUrl);
    if (backdrop) fd.append("backdrop", backdrop);
    else if (f.backdropUrl) fd.append("backdropUrl", f.backdropUrl);
    setSaving(true);
    try {
      const res = editing ? await adminApi.updateMovie(movie._id, fd) : await adminApi.createMovie(fd);
      toast.success(res.message);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit “${movie.title}”` : "Add a new movie"} wide footer={
      <>
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button form="movie-form" className="btn-primary" disabled={saving}>{saving && <Spinner />} {editing ? "Save changes" : "Add movie"}</button>
      </>
    }>
      <form id="movie-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *"><input className="input" required value={f.title} onChange={set("title")} /></Field>
          <Field label="Tagline"><input className="input" value={f.tagline} onChange={set("tagline")} /></Field>
        </div>
        <Field label="Description *"><textarea className="input min-h-24" required value={f.description} onChange={set("description")} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Genres *" hint="Comma separated"><input className="input" required value={f.genres} onChange={set("genres")} placeholder="Action, Drama" /></Field>
          <Field label="Languages *" hint="Comma separated"><input className="input" required value={f.languages} onChange={set("languages")} placeholder="English, Hindi" /></Field>
          <Field label="Formats" hint="e.g. 2D, 3D, IMAX"><input className="input" value={f.formats} onChange={set("formats")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-5">
          <Field label="Duration (min) *"><input type="number" min="1" className="input" required value={f.duration} onChange={set("duration")} /></Field>
          <Field label="Release date *"><input type="date" className="input" required value={f.releaseDate} onChange={set("releaseDate")} /></Field>
          <Field label="Certificate">
            <select className="input" value={f.certificate} onChange={set("certificate")}>{["U", "UA", "A", "S"].map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
          <Field label="Rating /10"><input type="number" min="0" max="10" step="0.1" className="input" value={f.rating} onChange={set("rating")} /></Field>
          <Field label="Status">
            <select className="input" value={f.status} onChange={set("status")}>
              <option value="now_showing">Now showing</option><option value="upcoming">Upcoming</option><option value="ended">Ended</option>
            </select>
          </Field>
        </div>
        <Field label="Trailer URL (YouTube)"><input className="input" value={f.trailerUrl} onChange={set("trailerUrl")} placeholder="https://www.youtube.com/watch?v=…" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <ImagePicker label={`Poster ${editing ? "" : "*"}`} file={poster} setFile={setPoster} url={f.posterUrl} setUrl={(v) => setF((x) => ({ ...x, posterUrl: v }))} current={movie?.poster} aspect="aspect-[2/3]" />
          <ImagePicker label="Backdrop (wide)" file={backdrop} setFile={setBackdrop} url={f.backdropUrl} setUrl={(v) => setF((x) => ({ ...x, backdropUrl: v }))} current={movie?.backdrop} aspect="aspect-video" />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-brand-500" checked={f.isTrending} onChange={set("isTrending")} /> Trending (shown in homepage hero)</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-brand-500" checked={f.isPopular} onChange={set("isPopular")} /> Popular</label>
        </div>
        <PeopleEditor label="Cast" rolePlaceholder="Character" people={f.cast} onChange={(cast) => setF({ ...f, cast })} />
        <PeopleEditor label="Crew" rolePlaceholder="Job (Director, Music…)" people={f.crew} onChange={(crew) => setF({ ...f, crew })} />
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default function Movies() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounce(search, 300);
  const { data, loading, error, reload } = useAsync(() => adminApi.movies({ search: q || undefined, status: status || undefined }), [q, status]);
  const [editing, setEditing] = useState(null); // null | {} (new) | movie
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const openEdit = async (m) => {
    try {
      const res = await adminApi.movie(m._id); // list omits cast/crew
      setEditing(res.movie);
    } catch (err) {
      toast.error(err.message);
    }
  };
  const doDelete = async () => {
    setBusy(true);
    try {
      await adminApi.deleteMovie(toDelete._id);
      toast.success("Movie deleted");
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Movies" subtitle={data ? `${data.total} titles in the catalogue` : " "} actions={<button onClick={() => setEditing({})} className="btn-primary"><Plus className="h-4 w-4" /> Add movie</button>} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-10" placeholder="Search by title, cast, genre…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="now_showing">Now showing</option><option value="upcoming">Upcoming</option><option value="ended">Ended</option>
          </select>
        </div>
        {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? (
          <EmptyState icon={Film} title="No movies found" message="Add your first movie to start scheduling shows." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Movie</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Release</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((m) => (
                  <tr key={m._id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb src={m.poster} title={m.title} />
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{m.title} {m.isTrending && <span className="ml-1 text-[10px] font-bold text-brand-400">TRENDING</span>}</p>
                          <p className="text-xs text-slate-500">{m.genres.join(", ")} · {m.languages.join(", ")} · {m.certificate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge value={m.status} /></td>
                    <td className="px-4 py-3 text-slate-300">{fmtDate(m.releaseDate)}</td>
                    <td className="px-4 py-3 text-slate-300">{duration(m.duration)}</td>
                    <td className="px-4 py-3 text-slate-300">{m.rating ? m.rating.toFixed(1) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" title="Edit" aria-label={`Edit ${m.title}`}><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setToDelete(m)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Delete" aria-label={`Delete ${m.title}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && <MovieForm movie={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <ConfirmDialog open={Boolean(toDelete)} title="Delete movie?" message={`“${toDelete?.title}” and its upcoming shows and reviews will be removed. This is refused if customers hold active bookings.`} confirmLabel="Delete" busy={busy} onConfirm={doDelete} onClose={() => setToDelete(null)} />
    </>
  );
}
