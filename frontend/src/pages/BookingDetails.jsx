import { ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin, Printer, XCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorState, Modal, PageLoader, Poster, Spinner } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { bookingApi } from "../services/api";
import { fmtDate, fmtDateTime, fmtTime, money, statusStyle } from "../utils/format";

// Decorative, deterministic barcode generated from the booking reference.
function Barcode({ value }) {
  const bars = [];
  let x = 0;
  for (let i = 0; i < value.length * 3; i++) {
    const code = value.charCodeAt(i % value.length) + i * 7;
    const w = (code % 3) + 1;
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y="0" width={w} height="48" />);
    x += w + 1;
  }
  return (
    <svg viewBox={`0 0 ${x} 48`} className="h-12 w-full fill-slate-900" preserveAspectRatio="none" aria-label={`Barcode ${value}`}>
      {bars}
    </svg>
  );
}

export default function BookingDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get("new") === "1";
  const { data, loading, error, reload } = useAsync(() => bookingApi.get(id), [id]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <PageLoader label="Fetching your ticket…" />;
  if (error) return <div className="container-x pt-10"><ErrorState error={error} onRetry={reload} /></div>;
  const { booking: b, canCancel, cancellationCutoffHours } = data;
  const s = b.snapshot;

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await bookingApi.cancel(b._id, "Cancelled by customer");
      toast.success(res.message);
      setConfirmOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="container-x max-w-3xl pt-8">
      <Link to="/account/bookings" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white print:hidden"><ArrowLeft className="h-4 w-4" /> My bookings</Link>

      {isNew && b.status === "confirmed" && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 animate-slide-up print:hidden">
          <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-400" />
          <div>
            <h1 className="font-display text-xl font-bold text-white">Booking confirmed!</h1>
            <p className="text-sm text-slate-300">Your tickets are booked. Show this m-ticket at the cinema entrance.</p>
          </div>
        </div>
      )}

      {/* Ticket */}
      <div className="overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl shadow-black/50 animate-slide-up">
        <div className="relative flex gap-5 bg-gradient-to-br from-ink-800 to-ink-900 p-6 text-white">
          <Poster src={s.poster} title={s.movieTitle} className="h-36 w-24 shrink-0 rounded-xl ring-1 ring-white/10" />
          <div className="min-w-0 flex-1">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusStyle(b.status)}`}>{b.status}</span>
            <h2 className="mt-2 font-display text-2xl font-bold leading-tight">{s.movieTitle}</h2>
            <p className="mt-1 text-sm text-slate-300">{s.certificate} · {s.language} · {s.format}</p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-300"><MapPin className="h-4 w-4 text-brand-400" /> {s.theatreName}</p>
            <p className="ml-5 text-xs text-slate-400">{s.theatreAddress}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 p-6 sm:grid-cols-4">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDays className="h-4 w-4 text-slate-400" />{fmtDate(s.startTime, { weekday: "short", day: "numeric", month: "short" })}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Time</p><p className="mt-1 flex items-center gap-1.5 font-semibold"><Clock className="h-4 w-4 text-slate-400" />{fmtTime(s.startTime)}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Screen</p><p className="mt-1 font-semibold">{s.screenName}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Seats</p><p className="mt-1 font-semibold">{b.seats.map((x) => x.seatId).join(", ")}</p></div>
        </div>

        <div className="relative mx-6 border-t-2 border-dashed border-slate-200">
          <span className="absolute -left-9 -top-3 h-6 w-6 rounded-full bg-ink-900" />
          <span className="absolute -right-9 -top-3 h-6 w-6 rounded-full bg-ink-900" />
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_220px]">
          <div className="space-y-1.5 text-sm">
            {b.seats.map((x) => (
              <div key={x.seatId} className="flex justify-between text-slate-600"><span>{x.seatId} · {x.category}</span><span>{money(x.price)}</span></div>
            ))}
            <div className="flex justify-between text-slate-500"><span>Convenience fee</span><span>{money(b.convenienceFee)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>Total paid</span><span>{money(b.totalAmount)}</span></div>
            <p className="pt-1 text-xs text-slate-400">Payment: {b.paymentStatus.replace("_", " ")}{b.payment?.methodLabel ? ` via ${b.payment.methodLabel}` : b.payment?.provider ? ` via ${b.payment.provider === "demo" ? "test gateway" : "Razorpay"}` : ""}{b.payment?.paymentId ? ` · ${b.payment.paymentId}` : ""}</p>
          </div>
          <div className="text-center">
            <Barcode value={b.bookingId} />
            <p className="mt-2 font-mono text-sm font-bold tracking-[0.2em]">{b.bookingId}</p>
            <p className="text-[11px] text-slate-400">Booked {fmtDateTime(b.createdAt)}</p>
          </div>
        </div>
        {b.status === "cancelled" && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600">
            Cancelled on {fmtDateTime(b.cancelledAt)} · {b.cancellationReason}. Refund status: <b>{b.paymentStatus.replace("_", " ")}</b>.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-3 print:hidden">
        <button onClick={() => window.print()} className="btn-ghost"><Printer className="h-4 w-4" /> Print ticket</button>
        {b.status === "confirmed" &&
          (canCancel ? (
            <button onClick={() => setConfirmOpen(true)} className="btn border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"><XCircle className="h-4 w-4" /> Cancel booking</button>
          ) : (
            <p className="self-center text-xs text-slate-500">Cancellation closes {cancellationCutoffHours} hours before showtime.</p>
          ))}
      </div>

      <Modal open={confirmOpen} onClose={() => !cancelling && setConfirmOpen(false)} className="max-w-md">
        <div className="card bg-ink-800 p-6">
          <h3 className="font-display text-lg font-bold text-white">Cancel this booking?</h3>
          <p className="mt-2 text-sm text-slate-400">Your {b.seats.length} seat(s) will be released and a refund of <b className="text-white">{money(b.totalAmount)}</b> will be initiated to the original payment method.</p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setConfirmOpen(false)} disabled={cancelling} className="btn-ghost">Keep booking</button>
            <button onClick={cancel} disabled={cancelling} className="btn bg-red-600 text-white hover:bg-red-500">{cancelling && <Spinner className="h-4 w-4" />} Yes, cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
