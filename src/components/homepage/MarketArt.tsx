/**
 * MarketArt — a distinctive, crisp illustration per bet type for the Form Tables
 * tiles (and reusable elsewhere). Pure SVG so it stays sharp at any size and
 * theme-matches the club palette. One glyph per market category.
 */
export type Market = 'goals' | 'corners' | 'cards' | 'btts';

export function MarketArt({ market, className }: { market: Market; className?: string }) {
  switch (market) {
    case 'corners':
      return (
        <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Corners">
          <defs>
            <linearGradient id="ma-flag" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <radialGradient id="ma-cglow" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="52" r="46" fill="url(#ma-cglow)" />
          {/* corner arc on the grass */}
          <path d="M20 84 A 26 26 0 0 1 46 84" fill="none" stroke="#6ee7b7" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 84 h64" stroke="#6ee7b7" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
          {/* pole */}
          <rect x="45" y="18" width="4" height="66" rx="2" fill="#e7e5e4" />
          <circle cx="47" cy="18" r="3.4" fill="#f5c542" />
          {/* waving flag */}
          <path d="M49 21 Q 68 24 82 31 Q 69 35 66 38 Q 74 40 80 45 Q 62 47 49 44 Z" fill="url(#ma-flag)" />
          {/* motion */}
          <path d="M86 27 q6 3 8 8 M88 40 q5 3 7 7" fill="none" stroke="#a78bfa" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'goals':
      return (
        <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Goals">
          <defs>
            <radialGradient id="ma-ball" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>
            <radialGradient id="ma-gglow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="47" fill="url(#ma-gglow)" />
          {/* motion streaks */}
          <path d="M12 40 h16 M8 52 h14 M12 64 h16" stroke="#34d399" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
          {/* ball */}
          <circle cx="56" cy="50" r="30" fill="url(#ma-ball)" stroke="#94a3b8" strokeWidth="1.5" />
          {/* pentagon + seams */}
          <polygon points="56,38 66,45 62,57 50,57 46,45" fill="#1e293b" />
          <g stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M56,38 L56,28 M66,45 L77,42 M62,57 L69,67 M50,57 L43,67 M46,45 L35,42" />
          </g>
          <g fill="#1e293b">
            <path d="M56,26 l7,4 -1,-8 -6,-2 -6,2 -1,8z" opacity="0.85" />
          </g>
        </svg>
      );
    case 'cards':
      return (
        <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Cards">
          <defs>
            <linearGradient id="ma-yellow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="ma-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <radialGradient id="ma-rglow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#ma-rglow)" />
          {/* yellow card, tilted back */}
          <g transform="rotate(-14 42 52)">
            <rect x="26" y="26" width="34" height="50" rx="5" fill="url(#ma-yellow)" stroke="#a16207" strokeWidth="1" />
          </g>
          {/* red card, front */}
          <g transform="rotate(11 60 50)">
            <rect x="46" y="24" width="34" height="50" rx="5" fill="url(#ma-red)" stroke="#9f1239" strokeWidth="1" />
            <rect x="46" y="24" width="34" height="50" rx="5" fill="#ffffff" fillOpacity="0.08" />
          </g>
        </svg>
      );
    case 'btts':
    default:
      return (
        <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Both teams to score">
          <defs>
            <radialGradient id="ma-bglow" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="ma-bball" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="47" fill="url(#ma-bglow)" />
          {/* goal net frame */}
          <g stroke="#e7e5e4" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M20 30 h60 M20 30 v40 M80 30 v40" />
          </g>
          <g stroke="#a78bfa" strokeOpacity="0.4" strokeWidth="1.2">
            <path d="M28 30 v40 M38 30 v40 M50 30 v40 M62 30 v40 M72 30 v40 M20 42 h60 M20 56 h60" />
          </g>
          {/* two curved arrows converging (both teams score) */}
          <path d="M8 74 q10 -12 22 -12" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 62 l-7 -1 3 6z" fill="#34d399" />
          <path d="M92 74 q-10 -12 -22 -12" fill="none" stroke="#f5c542" strokeWidth="3" strokeLinecap="round" />
          <path d="M70 62 l7 -1 -3 6z" fill="#f5c542" />
          {/* ball resting in the net */}
          <circle cx="50" cy="58" r="12" fill="url(#ma-bball)" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="50,52 55,56 53,62 47,62 45,56" fill="#1e293b" />
        </svg>
      );
  }
}
