import { ArrowLeft, RefreshCw, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import SeatMap, { SeatLegend } from "../components/SeatMap";
import { CertBadge, ErrorState, PageLoader, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { bookingApi, showApi } from "../services/api";
import { fmtDateTime, money } from "../utils/format";

const MAX_SEATS = 10;

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { data, loading, error, reload, setData } = useAsync(() => showApi.get(id), [id, user?._id]);

  // Refresh seat availability every 20 s so users see seats others just took.
  useEffect(() => {
    const t = setInterval(() => showApi.get(id).then(setData).catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop any selected seat that became unavailable after a refresh.
  useEffect(() => {
    if (!data) return;
    const gone = new Set([...data.seats.booked, ...data.seats.locked]);
    setSelected((sel) => {
      const next = sel.filter((s) => !gone.has(s));
      if (next.length !== sel.length) toast.error("Some of your selected seats were just taken by someone else");
      return next;
    });
  }, [data]);

  const priceOf = useMemo(() => {
    const map = {};
    data?.show.layout.categories.forEach((c) => c.rows.forEach((r) => { map[r] = c; }));
    return (seatId) => map[seatId[0]];
  }, [data]);

  if (loading) return <PageLoader label="Loading seat layout…" />;
  if (error) return <div className="container-x pt-10"><ErrorState error={error} onRetry={reload} /></div>;

  const { show, seats } = data;
  const started = new Date(show.startTime) <= new Date();
  const subtotal = selected.reduce((n, s) => n + (priceOf(s)?.price || 0), 0);

  const toggle = (seatId, _cat, limitReached) => {
    setSelected((sel) => {
      if (sel.includes(seatId)) return sel.filter((s) => s !== seatId);
      if (limitReached) {
        toast.error(`You can select up to ${MAX_SEATS} seats`);
        return sel;
      }
      return [...sel, seatId];
    });
  };

  const proceed = async () => {
    if (!user) {
      toast("Please log in to book tickets", { icon: "🔐" });
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setSubmitting(true);
    try {
      const res = await bookingApi.create({ showId: show._id, seats: selected });
      navigate(`/checkout/${res.booking._id}`);
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) {
        setSelected([]);
        reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-32">
      <div className="border-b border-white/5 bg-ink-850/80">
        <div className="container-x flex items-center gap-4 py-4">
          <button onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/5" aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link to={`/movie/${show.movie.slug}`} className="truncate font-display text-lg font-bold text-white hover:text-brand-300">{show.movie.title}</Link>
              <CertBadge cert={show.movie.certificate} />
            </div>
            <p className="truncate text-xs text-slate-400">{show.theatre.name} · {show.screenName} · {fmtDateTime(show.startTime)} · {show.language} {show.format}</p>
          </div>
          <button onClick={reload} className="btn-ghost btn-sm hidden sm:inline-flex" title="Refresh availability"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
        </div>
      </div>

      <div className="container-x pt-8">
        {started ? (
          <ErrorState error={{ message: "This show has already started. Please pick another showtime." }} />
        ) : (
          <>
            <SeatLegend />
            <div className="card mt-6 p-4 sm:p-8">
              <SeatMap layout={show.layout} seats={seats} selected={selected} onToggle={toggle} maxSeats={MAX_SEATS} />
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">{show.availableSeats} of {show.totalSeats} seats available · Seats are held for you for a few minutes once you proceed.</p>
          </>
        )}
      </div>

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-850/95 backdrop-blur-xl animate-slide-up">
          <div className="container-x flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm text-slate-300">
                <span className="font-semibold text-white">{selected.length} seat{selected.length > 1 ? "s" : ""}</span> · {[...selected].sort().join(", ")}
              </p>
              <p className="font-display text-2xl font-bold text-white">{money(subtotal)} <span className="text-xs font-normal text-slate-400">+ fees</span></p>
            </div>
            <button onClick={proceed} disabled={submitting} className="btn-primary px-6 py-3 text-base">
              {submitting ? <Spinner /> : <Ticket className="h-5 w-5" />} {user ? "Proceed to pay" : "Log in to continue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
