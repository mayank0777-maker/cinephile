import { Ban, CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Pagination, Spinner, Thumb } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { adminApi } from "../services/api";
import { fmtDate, fmtTime, money, toDateInput } from "../utils/format";

function ScheduleForm({ movies, theatres, onClose, onSaved }) {
  const [f, setF] = useState({ movie: "", theatre: "", screenName: "", language: "", format: "2D", startDate: toDateInput(new Date()), days: 1, times: ["10:00", "13:30", "17:00", "20:30"], newTime: "" });
  const [prices, setPrices] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const movie = movies.find((m) => m._id === f.movie);
  const theatre = theatres.find((t) => t._id === f.theatre);
  const screen = theatre?.screens.find((s) => s.name === f.screenName);
  useEffect(() => { if (movie) setF((x) => ({ ...x, language: movie.languages[0], format: movie.formats[0] || "2D" })); }, [f.movie]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (theatre) setF((x) => ({ ...x, screenName: theatre.screens[0]?.name || "" })); }, [f.theatre]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPrices(Object.fromEntries((screen?.layout.categories || []).map((c) => [c.name, c.price]))); }, [screen?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every date × time combination, built in the admin's local timezone.
  const startTimes = useMemo(() => {
    const out = [];
    for (let d = 0; d < Number(f.days || 1); d++) {
      for (const t of f.times) {
        const [h, m] = t.split(":").map(Number);
        const dt = new Date(`${f.startDate}T00:00:00`);
        dt.setDate(dt.getDate() + d);
        dt.setHours(h, m, 0, 0);
        out.push(dt);
      }
    }
    return out.sort((a, b) => a - b);
  }, [f.startDate, f.days, f.times]);

  const addTime = () => {
    if (!/^\d{2}:\d{2}$/.test(f.newTime) || f.times.includes(f.newTime)) return;
    setF({ ...f, times: [...f.times, f.newTime].sort(), newTime: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!f.times.length) return setError("Add at least one show time");
    setSaving(true);
    try {
      const res = await adminApi.createShows({ movie: f.movie, theatre: f.theatre, screenName: f.screenName, language: f.language, format: f.format, prices, startTimes: startTimes.map((d) => d.toISOString()) });
      toast.success(res.message);
      if (res.skipped?.length) setResult(res);
      else onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} wide title="Schedule shows" footer={
      result ? <button onClick={onSaved} className="btn-primary">Done</button> : (
        <>
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button form="show-form" className="btn-primary" disabled={saving || !f.movie || !f.theatre}>{saving && <Spinner />} Schedule {startTimes.length} show{startTimes.length === 1 ? "" : "s"}</button>
        </>
      )
    }>
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="text-emerald-300">{result.created.length} show(s) scheduled.</p>
          <p className="text-amber-300">{result.skipped.length} skipped:</p>
          <ul className="space-y-1 text-xs text-slate-400">{result.skipped.map((s, i) => <li key={i}>• {new Date(s.startTime).toLocaleString("en-IN")}: {s.reason}</li>)}</ul>
        </div>
      ) : (
        <form id="show-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Movie *">
              <select className="input" required value={f.movie} onChange={(e) => setF({ ...f, movie: e.target.value })}>
                <option value="">Select a movie…</option>
                {movies.filter((m) => m.status !== "ended").map((m) => <option key={m._id} value={m._id}>{m.title}{m.status === "upcoming" ? " (upcoming)" : ""}</option>)}
              </select>
            </Field>
            <Field label="Theatre *">
              <select className="input" required value={f.theatre} onChange={(e) => setF({ ...f, theatre: e.target.value })}>
                <option value="">Select a theatre…</option>
                {theatres.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.city})</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Screen *">
              <select className="input" required value={f.screenName} onChange={(e) => setF({ ...f, screenName: e.target.value })} disabled={!theatre}>
                {(theatre?.screens || []).map((s) => <option key={s._id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Language *">
              <select className="input" required value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} disabled={!movie}>
                {(movie?.languages || []).map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select className="input" value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })}>
                {[...new Set([...(movie?.formats || ["2D"])])].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date *"><input type="date" className="input" required min={toDateInput(new Date())} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label="Repeat for (days)" hint="Creates the same times on consecutive days"><input type="number" min="1" max="30" className="input" value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></Field>
          </div>
          <Field label="Show times" hint={movie ? `Each show blocks the screen for ${movie.duration + 20} min (runtime + 20 min cleaning). Overlaps are skipped automatically.` : undefined}>
            <div className="flex flex-wrap items-center gap-2">
              {f.times.map((t) => (
                <span key={t} className="chip chip-active">{t} <button type="button" onClick={() => setF({ ...f, times: f.times.filter((x) => x !== t) })} aria-label={`Remove ${t}`}><X className="h-3 w-3" /></button></span>
              ))}
              <input type="time" className="input w-32 py-1.5" value={f.newTime} onChange={(e) => setF({ ...f, newTime: e.target.value })} />
              <button type="button" onClick={addTime} className="btn-ghost btn-sm">Add time</button>
            </div>
          </Field>
          {screen && (
            <Field label="Ticket prices for these shows" hint="Prefilled from the screen layout; override if needed.">
              <div className="grid gap-2 sm:grid-cols-3">
                {screen.layout.categories.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="flex-1 text-xs text-slate-300">{c.name} <span className="text-slate-500">({c.rows.join("")})</span></span>
                    <span className="text-xs text-slate-500">₹</span>
                    <input type="number" min="0" className="input w-20 px-2 py-1" value={prices[c.name] ?? ""} onChange={(e) => setPrices({ ...prices, [c.name]: e.target.value })} />
                  </div>
                ))}
              </div>
            </Field>
          )}
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
        </form>
      )}
    </Modal>
  );
}

function EditShow({ show, onClose, onSaved }) {
  const local = new Date(show.startTime);
  const [date, setDate] = useState(toDateInput(local));
  const [time, setTime] = useState(`${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`);
  const [prices, setPrices] = useState(Object.fromEntries(show.layout.categories.map((c) => [c.name, c.price])));
  const [saving, setSaving] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const start = new Date(`${date}T${time}:00`);
      const body = { prices };
      if (start.getTime() !== new Date(show.startTime).getTime()) body.startTime = start.toISOString();
      const res = await adminApi.updateShow(show._id, body);
      toast.success(res.message);
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onClose={onClose} title={`Edit show · ${show.movie?.title}`} footer={
      <>
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button form="edit-show" className="btn-primary" disabled={saving}>{saving && <Spinner />} Save</button>
      </>
    }>
      <form id="edit-show" onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <p className="text-xs text-slate-500">Time can only be changed while no seats are sold.</p>
        <div className="space-y-2">
          {show.layout.categories.map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-slate-300">{c.name}</span>
              <input type="number" min="0" className="input w-28 py-2" value={prices[c.name]} onChange={(e) => setPrices({ ...prices, [c.name]: e.target.value })} />
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}

export default function Shows() {
  const [filters, setFilters] = useState({ movie: "", theatre: "", date: "", past: false, page: 1 });
  const movies = useAsync(() => adminApi.movies().then((r) => r.items), []);
  const theatres = useAsync(() => adminApi.theatres().then((r) => r.items), []);
  const shows = useAsync(() => {
    const params = { movie: filters.movie || undefined, theatre: filters.theatre || undefined, status: "all", page: filters.page, limit: 25 };
    if (filters.date) {
      const from = new Date(`${filters.date}T00:00:00`);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      Object.assign(params, { from: from.toISOString(), to: to.toISOString(), includePast: "true" });
    } else if (filters.past) params.includePast = "true";
    return adminApi.shows(params);
  }, [filters]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [action, setAction] = useState(null); // { type: 'cancel'|'delete', show }
  const [busy, setBusy] = useState(false);
  const setFilter = (k, v) => setFilters((x) => ({ ...x, [k]: v, page: k === "page" ? v : 1 }));

  const runAction = async () => {
    setBusy(true);
    try {
      const res = action.type === "cancel" ? await adminApi.updateShow(action.show._id, { status: "cancelled" }) : await adminApi.deleteShow(action.show._id);
      toast.success(res.message);
      setAction(null);
      shows.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Shows & showtimes" subtitle={shows.data ? `${shows.data.total} shows match` : " "} actions={<button onClick={() => setCreating(true)} className="btn-primary" disabled={!movies.data || !theatres.data}><Plus className="h-4 w-4" /> Schedule shows</button>} />
      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b border-white/5 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select className="input" value={filters.movie} onChange={(e) => setFilter("movie", e.target.value)} aria-label="Filter by movie">
            <option value="">All movies</option>
            {(movies.data || []).map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}
          </select>
          <select className="input" value={filters.theatre} onChange={(e) => setFilter("theatre", e.target.value)} aria-label="Filter by theatre">
            <option value="">All theatres</option>
            {(theatres.data || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          <input type="date" className="input" value={filters.date} onChange={(e) => setFilter("date", e.target.value)} aria-label="Filter by date" />
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-brand-500" checked={filters.past} onChange={(e) => setFilter("past", e.target.checked)} /> Include past shows</label>
        </div>
        {shows.loading ? <PageLoader /> : shows.error ? <ErrorState error={shows.error} onRetry={shows.reload} /> : !shows.data.items.length ? (
          <EmptyState icon={CalendarClock} title="No shows found" message="Change the filters or schedule new shows." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Movie</th><th className="px-4 py-3">Theatre / screen</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Occupancy</th><th className="px-4 py-3">Prices</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shows.data.items.map((s) => {
                  const sold = s.totalSeats - s.availableSeats;
                  const pct = Math.round((sold / s.totalSeats) * 100);
                  const past = new Date(s.startTime) < new Date();
                  return (
                    <tr key={s._id} className={`transition hover:bg-white/[0.02] ${past ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><Thumb src={s.movie?.poster} title={s.movie?.title} className="h-12 w-8" /><div><p className="font-medium text-white">{s.movie?.title || "Deleted movie"}</p><p className="text-xs text-slate-500">{s.language} · {s.format}</p></div></div></td>
                      <td className="px-4 py-3"><p className="text-slate-200">{s.theatre?.name}</p><p className="text-xs text-slate-500">{s.screenName} · {s.theatre?.city}</p></td>
                      <td className="px-4 py-3 whitespace-nowrap"><p className="text-slate-200">{fmtDate(s.startTime, { weekday: "short", day: "numeric", month: "short" })}</p><p className="text-xs text-slate-500">{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</p></td>
                      <td className="px-4 py-3 min-w-32"><div className="h-1.5 rounded-full bg-white/5"><div className={`h-full rounded-full ${pct > 85 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs text-slate-500">{sold}/{s.totalSeats} ({pct}%)</p></td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{money(s.minPrice)} – {money(s.maxPrice)}</td>
                      <td className="px-4 py-3"><Badge value={past && s.status === "scheduled" ? "ended" : s.status} label={past && s.status === "scheduled" ? "Completed" : undefined} /></td>
                      <td className="px-4 py-3">
                        {!past && s.status === "scheduled" && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditing(s)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" title="Edit time / prices" aria-label="Edit show"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setAction({ type: "cancel", show: s })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-500/10 hover:text-amber-300" title="Cancel show (refunds bookings)" aria-label="Cancel show"><Ban className="h-4 w-4" /></button>
                            <button onClick={() => setAction({ type: "delete", show: s })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Delete show" aria-label="Delete show"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {shows.data && <Pagination page={shows.data.page} pages={shows.data.pages} onChange={(p) => setFilter("page", p)} />}
      </div>
      {creating && <ScheduleForm movies={movies.data} theatres={theatres.data.filter((t) => t.isActive)} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); shows.reload(); }} />}
      {editing && <EditShow show={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); shows.reload(); }} />}
      <ConfirmDialog
        open={Boolean(action)}
        title={action?.type === "cancel" ? "Cancel this show?" : "Delete this show?"}
        message={action?.type === "cancel" ? "All bookings for this show will be cancelled and refunds initiated. Customers will see the cancellation in their bookings." : "The show will be permanently removed. Shows with confirmed bookings can't be deleted; cancel them instead."}
        confirmLabel={action?.type === "cancel" ? "Cancel show" : "Delete"}
        busy={busy}
        onConfirm={runAction}
        onClose={() => setAction(null)}
      />
    </>
  );
}
