import { Building2, MapPin, Monitor, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, PageLoader, Spinner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { adminApi } from "../services/api";
import { money } from "../utils/format";

const newScreen = (n = 1) => ({
  name: `Screen ${n}`,
  formats: "2D, 3D",
  layout: {
    seatsPerRow: 14,
    aisleAfter: "4, 10",
    categories: [
      { name: "Classic", price: 180, rows: "A, B, C" },
      { name: "Prime", price: 280, rows: "D, E, F, G" },
      { name: "Recliner", price: 480, rows: "H, J" },
    ],
  },
});

// Converts the API shape into editable strings and back.
const toForm = (t) => ({
  name: t.name,
  city: t.city,
  address: t.address,
  amenities: t.amenities.join(", "),
  isActive: t.isActive,
  screens: t.screens.map((s) => ({
    _id: s._id,
    name: s.name,
    formats: s.formats.join(", "),
    layout: { seatsPerRow: s.layout.seatsPerRow, aisleAfter: s.layout.aisleAfter.join(", "), categories: s.layout.categories.map((c) => ({ ...c, rows: c.rows.join(", ") })) },
  })),
});
const split = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
const toPayload = (f) => ({
  ...f,
  amenities: split(f.amenities),
  screens: f.screens.map((s) => ({
    ...s,
    formats: split(s.formats),
    layout: {
      seatsPerRow: Number(s.layout.seatsPerRow),
      aisleAfter: split(s.layout.aisleAfter).map(Number),
      categories: s.layout.categories.map((c) => ({ name: c.name, price: Number(c.price), rows: split(c.rows).map((r) => r.toUpperCase()) })),
    },
  })),
});

function ScreenEditor({ screen, onChange, onRemove, canRemove }) {
  const setLayout = (k, v) => onChange({ ...screen, layout: { ...screen.layout, [k]: v } });
  const setCat = (i, k, v) => setLayout("categories", screen.layout.categories.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const seatCount = screen.layout.categories.reduce((n, c) => n + split(c.rows).length, 0) * (Number(screen.layout.seatsPerRow) || 0);
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-white"><Monitor className="h-4 w-4 text-brand-400" /> {screen.name || "Screen"} <span className="text-xs font-normal text-slate-500">· {seatCount} seats</span></span>
        {canRemove && <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-300 hover:text-red-200">Remove screen</button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Screen name"><input className="input py-2" required value={screen.name} onChange={(e) => onChange({ ...screen, name: e.target.value })} /></Field>
        <Field label="Formats"><input className="input py-2" value={screen.formats} onChange={(e) => onChange({ ...screen, formats: e.target.value })} placeholder="2D, 3D, IMAX" /></Field>
        <Field label="Seats per row"><input type="number" min="1" max="40" className="input py-2" required value={screen.layout.seatsPerRow} onChange={(e) => setLayout("seatsPerRow", e.target.value)} /></Field>
        <Field label="Aisle after seat #"><input className="input py-2" value={screen.layout.aisleAfter} onChange={(e) => setLayout("aisleAfter", e.target.value)} placeholder="4, 10" /></Field>
      </div>
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">Seat categories (front rows first)</span>
          <button type="button" onClick={() => setLayout("categories", [...screen.layout.categories, { name: "", price: 0, rows: "" }])} className="text-xs font-semibold text-brand-400">+ Category</button>
        </div>
        <div className="space-y-2">
          {screen.layout.categories.map((c, i) => (
            <div key={i} className="grid grid-cols-[1.2fr_0.8fr_1.4fr_auto] gap-2">
              <input className="input py-2" required placeholder="Name (e.g. Recliner)" value={c.name} onChange={(e) => setCat(i, "name", e.target.value)} />
              <input type="number" min="0" className="input py-2" required placeholder="Price ₹" value={c.price} onChange={(e) => setCat(i, "price", e.target.value)} />
              <input className="input py-2" required placeholder="Rows: A, B, C" value={c.rows} onChange={(e) => setCat(i, "rows", e.target.value)} />
              <button type="button" disabled={screen.layout.categories.length < 2} onClick={() => setLayout("categories", screen.layout.categories.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30" aria-label="Remove category"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TheatreForm({ theatre, onClose, onSaved }) {
  const editing = Boolean(theatre);
  const [f, setF] = useState(() => (theatre ? toForm(theatre) : { name: "", city: "", address: "", amenities: "Dolby Atmos, Parking", isActive: true, screens: [newScreen(1)] }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = editing ? await adminApi.updateTheatre(theatre._id, toPayload(f)) : await adminApi.createTheatre(toPayload(f));
      toast.success(res.message);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} wide title={editing ? `Edit ${theatre.name}` : "Add theatre"} footer={
      <>
        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
        <button form="theatre-form" className="btn-primary" disabled={saving}>{saving && <Spinner />} {editing ? "Save changes" : "Add theatre"}</button>
      </>
    }>
      <form id="theatre-form" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Theatre name *"><input className="input" required value={f.name} onChange={set("name")} /></Field>
          <Field label="City *"><input className="input" required value={f.city} onChange={set("city")} placeholder="Mumbai" /></Field>
        </div>
        <Field label="Address *"><input className="input" required value={f.address} onChange={set("address")} /></Field>
        <Field label="Amenities" hint="Comma separated"><input className="input" value={f.amenities} onChange={set("amenities")} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-brand-500" checked={f.isActive} onChange={set("isActive")} /> Active (visible to customers)</label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label mb-0">Screens &amp; seat layouts</span>
            <button type="button" onClick={() => setF({ ...f, screens: [...f.screens, newScreen(f.screens.length + 1)] })} className="btn-ghost btn-sm"><Plus className="h-3.5 w-3.5" /> Add screen</button>
          </div>
          {f.screens.map((s, i) => (
            <ScreenEditor key={s._id || i} screen={s} canRemove={f.screens.length > 1} onRemove={() => setF({ ...f, screens: f.screens.filter((_, j) => j !== i) })} onChange={(ns) => setF({ ...f, screens: f.screens.map((x, j) => (j === i ? ns : x)) })} />
          ))}
          {editing && <p className="text-xs text-slate-500">Layout changes apply to newly scheduled shows. Existing shows keep the layout they were created with.</p>}
        </div>
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}

export default function Theatres() {
  const [city, setCity] = useState("");
  const { data, loading, error, reload } = useAsync(() => adminApi.theatres({ city: city || undefined }), [city]);
  const cities = useAsync(() => adminApi.theatres().then((r) => [...new Set(r.items.map((t) => t.city))].sort()), [data?.items?.length]);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    setBusy(true);
    try {
      await adminApi.deleteTheatre(toDelete._id);
      toast.success("Theatre deleted");
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
      <PageHeader title="Theatres" subtitle="Venues, screens and seat layouts" actions={
        <>
          <select className="input w-44" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city">
            <option value="">All cities</option>
            {(cities.data || []).map((c) => <option key={c}>{c}</option>)}
          </select>
          <button onClick={() => setEditing({})} className="btn-primary"><Plus className="h-4 w-4" /> Add theatre</button>
        </>
      } />
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? (
        <div className="card"><EmptyState icon={Building2} title="No theatres yet" message="Add a theatre with its screens to start scheduling shows." /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((t) => (
            <div key={t._id} className="card p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600/30 to-brand-600/30"><Building2 className="h-5 w-5 text-white" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{t.name}</h3>
                    {!t.isActive && <Badge value="cancelled" label="Inactive" />}
                  </div>
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-400"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {t.address}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" aria-label={`Edit ${t.name}`}><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setToDelete(t)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${t.name}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {t.screens.map((s) => {
                  const seats = s.layout.categories.reduce((n, c) => n + c.rows.length, 0) * s.layout.seatsPerRow;
                  return (
                    <div key={s._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                      <span className="font-semibold text-white">{s.name}</span>
                      <span className="text-slate-500">{seats} seats · {s.formats.join("/")}</span>
                      <span className="ml-auto flex flex-wrap gap-2 text-slate-400">{s.layout.categories.map((c) => <span key={c.name}>{c.name} {money(c.price)}</span>)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TheatreForm theatre={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      <ConfirmDialog open={Boolean(toDelete)} title="Delete theatre?" message={`${toDelete?.name} and its upcoming shows will be removed. This is refused if there are active bookings; deactivate it instead.`} confirmLabel="Delete" busy={busy} onConfirm={doDelete} onClose={() => setToDelete(null)} />
    </>
  );
}
