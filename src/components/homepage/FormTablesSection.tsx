import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Flame } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import raw from '@/data/formTablesData.json';
import type { FormFixtureRow } from '@/types/footy';

const SNAP = (raw as unknown as { fixtures: FormFixtureRow[] }).fixtures ?? [];

type Mode = 'over' | 'under';
type Cat = {
  key: 'goals' | 'corners' | 'cards' | 'btts';
  label: string;
  defaultLine: string;
  /** Return the OVER% at a given line (BTTS is always btts_pct). */
  overPct: (f: FormFixtureRow, line: string) => number | null;
  /** True when there's no separate line (BTTS). */
  isBinary?: boolean;
  lines: string[];
};
const CATS: Cat[] = [
  { key: 'goals',   label: 'Goals',   defaultLine: '2.5',  lines: ['1.5','2.5','3.5'], overPct: (f, l) => f.goals_over?.[l] ?? null },
  { key: 'corners', label: 'Corners', defaultLine: '9.5',  lines: ['8.5','9.5','10.5','11.5'], overPct: (f, l) => f.corners_over?.[l] ?? null },
  { key: 'cards',   label: 'Cards',   defaultLine: '3.5',  lines: ['2.5','3.5','4.5'], overPct: (f, l) => (f.cards_over as Record<string, number> | undefined)?.[l] ?? null },
  { key: 'btts',    label: 'BTTS',    defaultLine: '',     lines: [], isBinary: true, overPct: (f) => f.btts_pct ?? null },
];

const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

/**
 * FormTablesSection — homepage mini form-table. Real data, FlashScore density.
 * Live market tabs (Goals / Corners / Cards / BTTS) + Over/Under toggle drive
 * a compact top-5 list of today's best fixtures for the picked slice. Each
 * row deep-links into the full /form-tables page with the same filters
 * pre-applied. No horizontal scroll, everything visible on mobile.
 */
export function FormTablesSection() {
  const [catKey, setCatKey] = useState<Cat['key']>('goals');
  const [mode, setMode] = useState<Mode>('over');
  const cat = CATS.find((c) => c.key === catKey)!;
  const [line, setLine] = useState<string>(cat.defaultLine);

  const rows = useMemo(() => {
    const today = todayISO();
    // Prefer today; if the slate has nothing today, show whatever the snapshot has.
    const todayFx = SNAP.filter((f) => f.date === today);
    const pool = todayFx.length ? todayFx : SNAP.slice(0, 40);
    const activeLine = cat.isBinary ? '' : line;

    const withPct = pool.map((f) => {
      const overPct = cat.overPct(f, activeLine);
      if (overPct == null) return null;
      const pct = mode === 'under' ? Math.round((100 - overPct) * 10) / 10 : overPct;
      return { f, pct };
    }).filter(Boolean) as { f: FormFixtureRow; pct: number }[];

    return withPct.sort((a, b) => b.pct - a.pct).slice(0, 5);
  }, [cat, line, mode]);

  const selectionLabel = cat.isBinary
    ? mode === 'over' ? 'BTTS · Yes' : 'BTTS · No'
    : `${mode === 'over' ? 'Over' : 'Under'} ${line} ${cat.label}`;

  const deepLink = `/form-tables?cat=${cat.key}&mode=${mode}${cat.isBinary ? '' : `&mark=${line}`}`;

  return (
    <section
      id="form-tables"
      className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#040a06]/60"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-emerald-400/15 bg-emerald-500/[0.06] px-3.5 py-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <Flame className="h-4 w-4 shrink-0 text-emerald-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/90">Form</span>
          <span className="truncate text-[13px] font-bold text-white/80">Today's top fixtures</span>
        </div>
        <Link
          to={deepLink}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Controls — market tabs */}
      <div className="border-b border-white/[0.06] bg-black/20 px-2.5 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => { setCatKey(c.key); setLine(c.defaultLine); }}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wide transition-colors ${
                catKey === c.key
                  ? 'bg-emerald-500 text-[#04140d] shadow-[0_4px_14px_-6px_rgba(16,185,129,0.9)]'
                  : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {/* Over/Under + Line */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pb-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            {(['over', 'under'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
                  mode === m ? 'bg-violet-500 text-white' : 'text-white/55 hover:text-white'
                }`}
              >
                {m === 'over' ? (cat.isBinary ? 'Yes' : 'Over') : (cat.isBinary ? 'No' : 'Under')}
              </button>
            ))}
          </div>
          {!cat.isBinary && (
            <div className="inline-flex flex-wrap gap-1">
              {cat.lines.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLine(l)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
                    line === l
                      ? 'border-[#f5c542]/60 bg-[#f5c542]/15 text-[#f8e7a1]'
                      : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
            {selectionLabel}
          </span>
        </div>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="px-3.5 py-6 text-center text-[12px] text-white/55">
          Nothing on today for this market. Try another tab.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {rows.map(({ f, pct }, i) => (
            <li key={f.id}>
              <Link
                to={deepLink}
                className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-emerald-500/[0.06]"
              >
                <span className="w-4 shrink-0 text-center text-[11px] font-black text-white/35">{i + 1}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <TeamAvatar name={f.home.name} logoUrl={f.home.logo} size={22} className="rounded bg-black/30 p-px" />
                  <span className="text-[9px] font-black text-white/40">v</span>
                  <TeamAvatar name={f.away.name} logoUrl={f.away.logo} size={22} className="rounded bg-black/30 p-px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold text-white">
                    {f.home.short || f.home.name} <span className="text-white/40">v</span> {f.away.short || f.away.name}
                  </div>
                  <div className="truncate text-[10px] text-white/45">{f.time} · {f.region}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`font-display text-base leading-none ${pct >= 70 ? 'text-emerald-300' : pct >= 55 ? 'text-[#f5c542]' : 'text-white/70'}`}>{pct}%</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45">form</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Footer explore */}
      <Link
        to={deepLink}
        className="group flex w-full items-center justify-center gap-2 border-t border-violet-500/30 bg-gradient-to-r from-violet-600/15 via-violet-500/10 to-violet-600/15 py-2.5 text-[12px] font-black uppercase tracking-wide text-violet-100 transition-colors hover:from-violet-600/25 hover:to-violet-600/25"
      >
        Open full {cat.label} table
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
