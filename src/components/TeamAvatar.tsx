import { useState } from "react";

/** Team badge. Uses a real crest URL when available, else (or on load failure)
 *  a clean coloured initials avatar (deterministic colour per club). */
export function TeamAvatar({ name, size = 32, logoUrl, className = "" }: { name: string; size?: number; logoUrl?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`rounded-md object-contain bg-white/5 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-bold text-white shrink-0 border border-white/10 ${className}`}
      style={{ width: size, height: size, background: `hsl(${h} 42% 32%)`, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
