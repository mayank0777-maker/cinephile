import { Link } from "react-router-dom";

// Brand logo: film-reel + movie-camera mark with the glossy blue-to-orange "Cinephile" wordmark.
export function Wordmark({ className = "text-2xl" }) {
  return (
    <span
      className={`font-display font-extrabold italic leading-none tracking-tight ${className}`}
      style={{
        backgroundImage: "linear-gradient(180deg, #e0f2fe 0%, #38bdf8 38%, #2563eb 55%, #f59e0b 72%, #f97316 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextStroke: "0.6px rgba(255,255,255,0.85)",
        filter: "drop-shadow(0 2px 6px rgba(56,189,248,0.35)) drop-shadow(0 1px 0 rgba(0,0,0,0.6))",
        paddingRight: "0.08em", // italic overhang
      }}
    >
      Cinephile
    </span>
  );
}

export default function Logo({ className = "" }) {
  return (
    <Link to="/" className={`group flex items-center gap-2 ${className}`} aria-label="Cinephile home">
      <img src="/logo-mark.svg" alt="" aria-hidden className="h-9 w-auto transition duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <Wordmark />
    </Link>
  );
}
