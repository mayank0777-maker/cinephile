import { Armchair } from "lucide-react";
import { money } from "../utils/format";

/**
 * Theatre seat layout. Premium rows are drawn at the back (top) and the screen at the bottom,
 * the way cinema seat pickers usually present it.
 *  layout   – { categories: [{name, price, rows}], seatsPerRow, aisleAfter }
 *  seats    – { booked: [], locked: [], mine: [] }
 *  selected – array of seat ids
 */
export default function SeatMap({ layout, seats, selected, onToggle, maxSeats }) {
  const booked = new Set(seats.booked);
  const locked = new Set(seats.locked);
  const aisles = new Set(layout.aisleAfter || []);
  const categories = [...layout.categories].reverse(); // back rows first
  const isRecliner = (name) => /recliner/i.test(name);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="mx-auto w-max min-w-full px-2">
        {categories.map((cat) => (
          <div key={cat.name} className="mb-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{cat.name}</span>
              <span className="text-xs font-bold text-white">{money(cat.price)}</span>
              <span className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-2">
              {[...cat.rows].reverse().map((row) => (
                <div key={row} className="flex items-center justify-center gap-1.5">
                  <span className="w-5 text-center text-[11px] font-semibold text-slate-500">{row}</span>
                  {Array.from({ length: layout.seatsPerRow }, (_, i) => {
                    const n = i + 1;
                    const id = `${row}${n}`;
                    const isBooked = booked.has(id);
                    const isLocked = locked.has(id);
                    const isSelected = selected.includes(id);
                    const unavailable = isBooked || isLocked;
                    const limitReached = !isSelected && selected.length >= maxSeats;
                    const big = isRecliner(cat.name);
                    return (
                      <span key={id} className={`flex ${aisles.has(n) ? "mr-5" : ""}`}>
                        <button
                          type="button"
                          disabled={unavailable}
                          onClick={() => onToggle(id, cat, limitReached)}
                          title={unavailable ? `${id} · ${isBooked ? "Booked" : "Being booked"}` : `${id} · ${cat.name} · ${money(cat.price)}`}
                          aria-label={`Seat ${id}${unavailable ? " unavailable" : isSelected ? " selected" : ""}`}
                          aria-pressed={isSelected}
                          className={[
                            "relative grid place-items-center rounded-t-lg rounded-b-sm border text-[10px] font-semibold transition-all duration-150",
                            big ? "h-8 w-9" : "h-7 w-7",
                            isBooked
                              ? "cursor-not-allowed border-transparent bg-white/[0.06] text-transparent"
                              : isLocked
                                ? "cursor-not-allowed border-amber-500/30 bg-amber-500/15 text-transparent"
                                : isSelected
                                  ? "scale-105 border-brand-400 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-600/40"
                                  : "border-emerald-500/40 bg-transparent text-slate-400 hover:border-emerald-400 hover:bg-emerald-500/15 hover:text-white",
                          ].join(" ")}
                        >
                          {isBooked ? <Armchair className="h-3.5 w-3.5 text-white/15" /> : n}
                        </button>
                      </span>
                    );
                  })}
                  <span className="w-5 text-center text-[11px] font-semibold text-slate-500">{row}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mx-auto mt-10 max-w-xl">
          <div className="h-2 rounded-[100%] bg-gradient-to-r from-transparent via-brand-400/80 to-transparent shadow-[0_8px_40px_8px_rgba(244,63,94,0.35)]" />
          <p className="mt-3 text-center text-[11px] uppercase tracking-[0.35em] text-slate-500">All eyes this way · Screen</p>
        </div>
      </div>
    </div>
  );
}

export function SeatLegend() {
  const item = (cls, label) => (
    <span className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`h-4 w-4 rounded-t-md rounded-b-sm border ${cls}`} /> {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {item("border-emerald-500/50", "Available")}
      {item("border-brand-400 bg-brand-500", "Selected")}
      {item("border-amber-500/30 bg-amber-500/15", "Being booked")}
      {item("border-transparent bg-white/10", "Sold")}
    </div>
  );
}
