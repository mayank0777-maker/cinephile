import { AlertTriangle, Film, Loader2, RefreshCw, Star } from "lucide-react";
import { useState } from "react";
import { certificateColor, imageUrl } from "../utils/format";

export const Spinner = ({ className = "h-5 w-5" }) => <Loader2 className={`animate-spin ${className}`} aria-hidden />;

export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400" role="status">
      <Spinner className="h-8 w-8 text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Film, title, message, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center animate-fade-in">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {message && <p className="max-w-md text-sm text-slate-400">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-red-500/20 px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <p className="font-medium text-white">Something went wrong</p>
      <p className="max-w-md text-sm text-slate-400">{error?.message || String(error)}</p>
      {onRetry && (
        <button className="btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export const CertBadge = ({ cert }) => (
  <span className={`inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-bold ${certificateColor(cert)}`}>{cert}</span>
);

export const Rating = ({ value, className = "" }) =>
  value ? (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold text-amber-300 ${className}`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {Number(value).toFixed(1)}
    </span>
  ) : null;

// Poster image with a graceful gradient fallback when the image fails to load.
export function Poster({ src, title, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div className={`flex items-end bg-gradient-to-br from-brand-700/60 via-ink-700 to-violet-900/60 p-3 ${className}`}>
        <span className="font-display text-sm font-bold leading-tight text-white/90">{title}</span>
      </div>
    );
  return <img src={imageUrl(src)} alt={`${title} poster`} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

export const MovieCardSkeleton = () => (
  <div className="w-full">
    <div className="skeleton aspect-[2/3] w-full" />
    <div className="skeleton mt-3 h-4 w-3/4" />
    <div className="skeleton mt-2 h-3 w-1/2" />
  </div>
);

export function Modal({ open, onClose, children, className = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Close dialog" />
      <div className={`relative w-full animate-slide-up ${className}`}>{children}</div>
    </div>
  );
}
