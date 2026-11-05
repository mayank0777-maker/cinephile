import { AlertTriangle, CreditCard, Lock, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import PaymentGateway from "../components/PaymentGateway";
import { EmptyState, ErrorState, PageLoader, Poster, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAsync, useCountdown } from "../hooks/useAsync";
import { bookingApi, paymentApi } from "../services/api";
import { fmtDateTime, money } from "../utils/format";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const booking = useAsync(() => bookingApi.get(bookingId).then((r) => r.booking), [bookingId]);
  const config = useAsync(() => paymentApi.config(), []);
  const [paying, setPaying] = useState(false);
  const [demoOrder, setDemoOrder] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const left = useCountdown(booking.data?.status === "pending" ? booking.data.expiresAt : null);

  useEffect(() => {
    if (booking.data?.status === "pending" && left === 0 && booking.data.expiresAt && new Date(booking.data.expiresAt) < new Date()) {
      toast.error("Your seat hold expired");
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (booking.loading || config.loading) return <PageLoader label="Preparing checkout…" />;
  if (booking.error) return <div className="container-x pt-10"><ErrorState error={booking.error} onRetry={booking.reload} /></div>;
  const b = booking.data;
  if (b.status === "confirmed") return <Navigate to={`/booking/${b.bookingId}`} replace />;

  const expired = b.status !== "pending" || left === 0;
  const mode = config.data?.mode;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  const done = (res) => {
    toast.success("Payment successful! Enjoy the show 🍿");
    navigate(`/booking/${res.booking.bookingId}?new=1`, { replace: true });
  };

  const pay = async () => {
    setPaymentError("");
    setPaying(true);
    try {
      const order = await paymentApi.order(b._id);
      if (order.mode === "demo") {
        setDemoOrder(order);
        setPaying(false);
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) throw { message: "Could not load Razorpay checkout. Check your internet connection." };
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Cinephile",
        description: `${b.snapshot.movieTitle} · ${b.seats.length} ticket(s)`,
        prefill: order.prefill,
        notes: { bookingId: b.bookingId },
        theme: { color: "#e11d48" },
        handler: async (resp) => {
          try {
            const res = await paymentApi.verify(resp);
            done(res);
          } catch (err) {
            setPaymentError(err.message);
            toast.error(err.message);
            booking.reload();
          }
        },
        modal: {
          ondismiss: () => {
            paymentApi.failed({ orderId: order.orderId, reason: "Checkout closed by user" }).catch(() => {});
            toast("Payment cancelled. Your seats are still held until the timer ends.", { icon: "⏳" });
            setPaying(false);
          },
        },
      });
      rzp.on("payment.failed", (resp) => {
        const reason = resp?.error?.description || "Payment failed";
        paymentApi.failed({ orderId: order.orderId, reason }).catch(() => {});
        setPaymentError(`${reason}. You can retry while your seats are held.`);
      });
      rzp.open();
    } catch (err) {
      setPaymentError(err.message);
      toast.error(err.message);
      if (err.status === 410) booking.reload();
      setPaying(false);
    }
  };

  // Called by the test-mode payment page once the user "pays". Only the method label is sent, never card data.
  const demoSuccess = async (details) => {
    setPaying(true);
    try {
      done(await paymentApi.demoComplete(demoOrder.orderId, details));
    } catch (err) {
      setPaymentError(err.message);
      toast.error(err.message);
      setDemoOrder(null);
      setPaying(false);
      booking.reload();
    }
  };
  const demoFail = async (reason = "Payment failed") => {
    await paymentApi.failed({ orderId: demoOrder.orderId, reason }).catch(() => {});
    setDemoOrder(null);
    setPaying(false);
    setPaymentError(`${reason}. Your seats are still held, so you can try again.`);
    toast.error("Payment failed");
  };
  const demoClose = async () => {
    await paymentApi.failed({ orderId: demoOrder.orderId, reason: "Checkout closed by user" }).catch(() => {});
    setDemoOrder(null);
    setPaying(false);
    toast("Payment cancelled. Your seats are still held until the timer ends.", { icon: "⏳" });
  };

  const cancel = async () => {
    try {
      await bookingApi.release(b._id);
      toast.success("Booking cancelled and seats released");
    } catch { /* ignore */ }
    navigate(`/show/${b.show}`, { replace: true });
  };

  return (
    <div className="container-x max-w-5xl pt-8">
      <h1 className="font-display text-3xl font-extrabold text-white">Review &amp; pay</h1>
      <p className="mt-1 text-sm text-slate-400">Booking reference <span className="font-mono text-slate-200">{b.bookingId}</span></p>

      {expired ? (
        <div className="mt-8">
          <EmptyState icon={Timer} title={b.status === "pending" || b.status === "expired" ? "Your seat hold has expired" : `This booking is ${b.status}`} message="Seats are only held for a few minutes. Please select your seats again." action={<Link to={`/show/${b.show}`} className="btn-primary btn-sm">Select seats again</Link>} />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className={`flex items-center gap-3 rounded-2xl border p-4 ${left < 60 ? "border-red-500/40 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
              <Timer className={`h-5 w-5 ${left < 60 ? "text-red-300" : "text-amber-300"}`} />
              <p className="text-sm text-slate-200">Seats held for you. Complete payment within <b className="font-mono text-base text-white">{mm}:{ss}</b></p>
            </div>

            <div className="card flex gap-5 p-5">
              <Poster src={b.snapshot.poster} title={b.snapshot.movieTitle} className="h-36 w-24 shrink-0 rounded-xl" />
              <div className="min-w-0 space-y-1.5">
                <h2 className="font-display text-xl font-bold text-white">{b.snapshot.movieTitle}</h2>
                <p className="text-sm text-slate-300">{b.snapshot.language} · {b.snapshot.format} · {b.snapshot.certificate}</p>
                <p className="text-sm text-slate-300">{fmtDateTime(b.snapshot.startTime)}</p>
                <p className="text-sm text-slate-400">{b.snapshot.theatreName}, {b.snapshot.screenName}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {b.seats.map((s) => <span key={s.seatId} className="rounded-md bg-brand-500/15 px-2 py-0.5 text-xs font-bold text-brand-300">{s.seatId}</span>)}
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="mb-3 font-semibold text-white">Contact details</h3>
              <p className="text-sm text-slate-300">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}{user?.phone ? ` · ${user.phone}` : ""}</p>
              <p className="mt-2 text-xs text-slate-500">Your m-ticket will be available in My Bookings right after payment.</p>
            </div>
          </div>

          <aside className="card h-fit p-5 lg:sticky lg:top-24">
            <h3 className="font-display text-lg font-bold text-white">Order summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              {Object.entries(b.seats.reduce((acc, s) => { (acc[s.category] ||= []).push(s); return acc; }, {})).map(([cat, list]) => (
                <div key={cat} className="flex justify-between text-slate-300">
                  <span>{cat} × {list.length} <span className="text-xs text-slate-500">({list.map((s) => s.seatId).join(", ")})</span></span>
                  <span>{money(list.reduce((n, s) => n + s.price, 0))}</span>
                </div>
              ))}
              <div className="flex justify-between text-slate-400"><span>Convenience fee</span><span>{money(b.convenienceFee)}</span></div>
              <div className="my-3 border-t border-dashed border-white/10" />
              <div className="flex justify-between text-lg font-bold text-white"><span>Total</span><span>{money(b.totalAmount)}</span></div>
            </div>

            {paymentError && (
              <div className="mt-4 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {paymentError}
              </div>
            )}

            {mode === "disabled" ? (
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">Online payments are not configured on this server. Ask the admin to add Razorpay test keys.</div>
            ) : (
              <button onClick={pay} disabled={paying} className="btn-primary mt-5 w-full py-3 text-base">
                {paying ? <Spinner /> : <CreditCard className="h-5 w-5" />} Pay {money(b.totalAmount)}
              </button>
            )}
            <button onClick={cancel} disabled={paying} className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">Cancel and release seats</button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="h-3 w-3" /> {mode === "razorpay" ? "Secured by Razorpay (test mode)" : mode === "demo" ? "Demo payment mode, no real charges" : "Payments unavailable"}
            </p>
          </aside>
        </div>
      )}
      {demoOrder && <PaymentGateway order={demoOrder} onSuccess={demoSuccess} onFail={demoFail} onClose={demoClose} />}
    </div>
  );
}
