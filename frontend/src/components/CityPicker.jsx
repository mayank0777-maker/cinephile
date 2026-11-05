import { Building2, MapPin, X } from "lucide-react";
import { useCity } from "../context/CityContext";
import { Modal } from "./ui";

export default function CityPicker() {
  const { city, setCity, cities, pickerOpen, setPickerOpen } = useCity();
  return (
    <Modal open={pickerOpen} onClose={() => setPickerOpen(false)}>
      <div className="card bg-ink-800 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Select your city</h2>
            <p className="text-sm text-slate-400">We'll show cinemas and showtimes near you.</p>
          </div>
          <button onClick={() => setPickerOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white/10" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => { setCity(c); setPickerOpen(false); }}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-semibold transition ${c === city ? "border-brand-500/60 bg-brand-500/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"}`}
            >
              <Building2 className={`h-6 w-6 ${c === city ? "text-brand-400" : "text-slate-500"}`} />
              {c}
            </button>
          ))}
          {!cities.length && <p className="col-span-full flex items-center gap-2 text-sm text-slate-400"><MapPin className="h-4 w-4" /> No cities yet — ask an admin to add theatres.</p>}
        </div>
      </div>
    </Modal>
  );
}
