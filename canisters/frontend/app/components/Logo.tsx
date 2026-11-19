import { useId } from "react";

/** Remohusen mark: a gabled roof with chimney sheltering a stylised "R". */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Remohusen">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e293b" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
        <linearGradient id={`${id}-roof`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${id}-bg)`} stroke="rgba(255,255,255,0.15)" />
      <rect x="42" y="13" width="6" height="11" rx="1.5" fill={`url(#${id}-roof)`} />
      <path
        d="M10 31 L32 13 L54 31"
        fill="none"
        stroke={`url(#${id}-roof)`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 52 V32 H32.5 a7 7 0 0 1 0 14 H22 M31 46 L40 52"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ name = "Remohusen", tagline }: { name?: string; tagline?: string }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-extrabold tracking-tight text-white">{name}</span>
        {tagline && (
          <span className="mt-1 hidden max-w-[15rem] truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-300 sm:block">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}
