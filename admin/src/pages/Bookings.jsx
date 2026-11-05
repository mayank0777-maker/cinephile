import { CheckCircle2, Eye, Search, Ticket, XCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Badge, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, PageLoader, Pagination, Thumb } from "../components/ui";
import { useAsync, useDebounce } from "../hooks/useAsync";
import { adminApi } from "../services/api";
import { fmtDateTime, money } from "../utils/format";

const STATUSES = ["", "confirmed", "pending", "cancelled", "failed", "expired"];

function BookingModal({ booking, onClose }) {
  if (!booking) return null;
  const s = booking.snapshot;
  return (
    <Modal open onClose={onClose} title={`Booking ${booking.bookingId}`}>
      <div className="space-y-4 text-sm">
        <div className="flex gap-4">
          <Thumb src={s.poster} title={s.movieTitle} className="h-24 w-16" />
          <div>
            <p className="font-display text-lg font-bold text-white">{s.movieTitle}</p>
            <p className="text-slate-400">{s.theatreName} · {s.screenName}, {s.city}</p>
            <p className="text-slate-400">{fmtDateTime(s.startTime)} · {s.language} {s.format}</p>
            <div className="mt-2 flex gap-2"><Badge value={booking.status} /><Badge value={booking.paymentStatus} /></div>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="label">Customer</p>
          <p className="text-white">{booking.user?.name || "Deleted user"}</p>
          <p className="text-slate-400">{booking.user?.email} {booking.user?.phone && `· ${booking.user.phone}`}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <p className="label">Seats</p>
          {booking.seats.map((x) => <div key={x.seatId} className="flex justify-between text-slate-300"><span>{x.seatId} · {x.category}</span><span>{money(x.price)}</span></div>)}
          <div className="flex justify-between text-slate-400"><span>Convenience fee</span><span>{money(booking.convenienceFee)}</span></div>
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white"><span>Total</span><span>{money(booking.totalAmount)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
          <p>Created: <span className="text-slate-200">{fmtDateTime(booking.createdAt)}</span></p>
          <p>Confirmed: <span className="text-slate-200">{fmtDateTime(booking.confirmedAt)}</span></p>
          <p>Paid with: <span className="text-slate-200">{booking.payment?.methodLabel || booking.payment?.provider || "—"}</span></p>
          <p className="truncate">Payment ID: <span className="font-mono text-slate-200">{booking.payment?.paymentId || "—"}</span></p>
          {booking.cancellationReason && <p className="col-span-2">Note: <span className="text-slate-200">{booking.cancellationReason}</span></p>}
        </div>
      </div>
    </Modal>
  );
}

export default function Bookings() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search, 300);
  const { data, loading, error, reload } = useAsync(() => adminApi.bookings({ status: status || undefined, search: q || undefined, page, limit: 20 }), [status, q, page]);
  const [viewing, setViewing] = useState(null);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await adminApi.setBookingStatus(action.booking._id, action.status, action.status === "cancelled" ? "Cancelled by admin" : undefined);
      toast.success(res.message);
      setAction(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Bookings" subtitle={data ? `${data.total} bookings` : " "} />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="input pl-10" placeholder="Search booking ID, movie, customer name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {STATUSES.map((s) => (
              <button key={s || "all"} onClick={() => { setStatus(s); setPage(1); }} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${status === s ? "bg-white text-ink-900" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>{s || "All"}</button>
            ))}
          </div>
        </div>
        {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : !data.items.length ? (
          <EmptyState icon={Ticket} title="No bookings found" message="Try a different filter or search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Movie / show</th><th className="px-4 py-3">Seats</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.items.map((b) => (
                  <tr key={b._id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><p className="font-mono text-xs font-semibold text-white">{b.bookingId}</p><p className="text-xs text-slate-500">{fmtDateTime(b.createdAt)}</p></td>
                    <td className="px-4 py-3"><p className="text-slate-200">{b.user?.name || "Deleted user"}</p><p className="text-xs text-slate-500">{b.user?.email}</p></td>
                    <td className="px-4 py-3"><p className="text-slate-200">{b.snapshot.movieTitle}</p><p className="text-xs text-slate-500">{b.snapshot.theatreName} · {fmtDateTime(b.snapshot.startTime)}</p></td>
                    <td className="px-4 py-3 text-xs text-slate-300">{b.seats.map((x) => x.seatId).join(", ")}</td>
                    <td className="px-4 py-3 font-semibold text-white">{money(b.totalAmount)}</td>
                    <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><Badge value={b.status} /><Badge value={b.paymentStatus} /></div></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setViewing(b)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white" title="View details" aria-label="View booking"><Eye className="h-4 w-4" /></button>
                        {b.status === "pending" && <button onClick={() => setAction({ booking: b, status: "confirmed" })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-300" title="Mark paid at box office" aria-label="Confirm booking"><CheckCircle2 className="h-4 w-4" /></button>}
                        {["pending", "confirmed"].includes(b.status) && <button onClick={() => setAction({ booking: b, status: "cancelled" })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300" title="Cancel booking" aria-label="Cancel booking"><XCircle className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
      </div>
      <BookingModal booking={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(action)}
        danger={action?.status === "cancelled"}
        title={action?.status === "cancelled" ? "Cancel booking?" : "Confirm booking?"}
        message={action?.status === "cancelled" ? `Booking ${action?.booking.bookingId} will be cancelled, its seats released${action?.booking.status === "confirmed" ? " and a refund initiated" : ""}.` : `Mark ${action?.booking.bookingId} as paid at the box office and confirm the seats?`}
        confirmLabel={action?.status === "cancelled" ? "Cancel booking" : "Confirm"}
        busy={busy}
        onConfirm={run}
        onClose={() => setAction(null)}
      />
    </>
  );
}
