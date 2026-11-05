import { X } from "lucide-react";
import { useEffect } from "react";
import { youtubeId } from "../utils/format";
import { Modal } from "./ui";

export default function TrailerModal({ movie, onClose }) {
  const id = youtubeId(movie?.trailerUrl);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Modal open={Boolean(movie)} onClose={onClose} className="max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display font-semibold text-white">{movie?.title} · Official Trailer</p>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate-300 hover:bg-white/10" aria-label="Close trailer"><X className="h-4 w-4" /></button>
        </div>
        {id ? (
          <div className="aspect-video">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
              title={`${movie?.title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="p-10 text-center text-slate-400">Trailer not available.</p>
        )}
      </div>
    </Modal>
  );
}
