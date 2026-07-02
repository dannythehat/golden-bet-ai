import { useEffect, useState } from 'react';

function parts(deadline: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done: false };
}

/** Live GW-deadline countdown. Pure client ticker; deadline comes from the API. */
export function Countdown({ deadline, className = '' }: { deadline: string | null; className?: string }) {
  const [t, setT] = useState(() => parts(deadline));
  useEffect(() => {
    setT(parts(deadline));
    const id = setInterval(() => setT(parts(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!t) return null;

  const cell = (v: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="min-w-[2.4ch] rounded-lg border border-[#f5c542]/30 bg-black/40 px-2 py-1 text-center font-display text-xl tabular-nums text-white md:text-2xl">
        {String(v).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/45">{label}</span>
    </div>
  );

  if (t.done) {
    return <span className={`text-[13px] font-black uppercase tracking-wide text-emerald-300 ${className}`}>Deadline passed — good luck!</span>;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {cell(t.d, 'days')}
      {cell(t.h, 'hrs')}
      {cell(t.m, 'min')}
      {cell(t.s, 'sec')}
    </div>
  );
}
