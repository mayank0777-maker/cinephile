import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { imageUrl, statusStyle } from "../utils/format";

export const Spinner = ({ className = "h-4 w-4" }) => <Loader2 className={`animate-spin ${className}`} aria-hidden />;

export const PageLoader = ({ label = "Loading…" }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400" role="status">
    <Spinner className="h-7 w-7 text-brand-500" />
    <span className="text-sm">{label}</span>
  </div>
);

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-slate-400"><Icon className="h-6 w-6" /></div>
      <p className="font-semibold text-white">{title}</p>
      {message && <p className="max-w-sm text-sm text-slate-400">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <AlertTriangle className="h-7 w-7 text-red-400" />
      <p className="text-sm text-slate-300">{error?.message || "Something went wrong"}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost btn-sm"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>}
    </div>
  );
}

export const Badge = ({ value, label }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle(value)}`}>{label || String(value).replace(/_/g, " ")}</span>
);

export function Thumb({ src, title, className = "h-14 w-10" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`grid shrink-0 place-items-center rounded-md bg-gradient-to-br from-brand-700/50 to-violet-800/50 text-[9px] font-bold text-white/80 ${className}`}>{(title || "?").slice(0, 2)}</div>;
  return <img src={imageUrl(src)} alt="" onError={() => setFailed(true)} className={`shrink-0 rounded-md object-cover ${className}`} />;
}

export function Modal({ open, onClose, title, children, wide = false, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:py-10" role="dialog" aria-modal="true">
      <button className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
      <div className={`relative w-full animate-slide-up rounded-2xl border border-white/10 bg-ink-800 shadow-2xl ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-white/10" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-white/5 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = true, busy, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} disabled={busy} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} disabled={busy} className={danger ? "btn bg-red-600 text-white hover:bg-red-500" : "btn-primary"}>{busy && <Spinner />} {confirmLabel}</button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-300">{message}</p>
    </Modal>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 border-t border-white/5 px-4 py-3 text-sm">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn-ghost btn-sm">Prev</button>
      <span className="text-slate-400">Page {page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="btn-ghost btn-sm">Next</button>
    </div>
  );
}

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const Field = ({ label, children, hint, className = "" }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
  </div>
);
