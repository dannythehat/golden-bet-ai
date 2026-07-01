import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Flame, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { TeamAvatar } from '@/components/TeamAvatar';
import { FormStrip } from '@/components/FormStrip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GafferPicksBox } from '@/components/homepage/GafferPicksBox';
import { supabase } from '@/integrations/supabase/client';
import raw from '@/data/formTablesData.json';
import type { FormFixtureRow as Fixture, FormValueCell, FormGame } from '@/types/footy';

type ValueCell = FormValueCell | null;
type TablesPayload = { leagues: { name: string; region: string }[]; fixtures: Fixture[] };
const SNAPSHOT = raw as unknown as TablesPayload;

/** Live today's slate from daily_form_tables (built 3am UK); snapshot fallback. */
function useFormTablesData(): { data: TablesPayload; live: boolean } {
  const { data } = useQuery({
    queryKey: ['daily_form_tables'],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<TablesPayload | null> => {
      // daily_form_tables isn't in the generated Supabase types yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('daily_form_tables')
        .select('leagues, fixtures, table_date')
        .order('table_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data || !Array.isArray(data.fixtures) || data.fixtures.length === 0) return null;
      return { leagues: Array.isArray(data.leagues) ? data.leagues : [], fixtures: data.fixtures as Fixture[] };
    },
  });
  return data ? { data, live: true } : { data: SNAPSHOT, live: false };
}

/* ── Category config ─────────────────────────────────────────────────── */
type CatKey = 'corners' | 'goals' | 'cards' | 'btts';
interface Cat {
  key: CatKey; label: string; unit: string; pct?: boolean;
  marks?: string[];
  avg: (f: Fixture) => number;
  over?: (f: Fixture, mark: string) => number | null;
  odds: (f: Fixture, mark: string | null) => number | null;
  value: (f: Fixture, mark: string | null) => ValueCell;
}
const CATS: Cat[] = [
  {
    key: 'corners', label: 'Corners', unit: 'corners', marks: ['8.5', '9.5', '10.5'],
    avg: (f) => f.corners_avg,
    over: (f, l) => f.corners_over[l] ?? null,
    odds: (f, l) => (l ? f.corners_odds[l] ?? null : null),
    value: (f, l) => (l ? f.value.corners[l] ?? null : null),
  },
  {
    key: 'goals', label: 'Goals', unit: 'goals', marks: ['2.5', '3.5', '4.5'],
    avg: (f) => f.goals_avg,
    over: (f, l) => f.goals_over[l] ?? null,
    odds: (f, l) => (l ? f.goals_odds[l] ?? null : null),
    value: (f, l) => (l ? f.value.goals[l] ?? null : null),
  },
  {
    key: 'cards', label: 'Cards', unit: 'cards', marks: ['3.5', '4.5', '5.5'],
    avg: (f) => f.cards_avg,
    odds: (f, l) => (l ? f.cards_odds[l] ?? null : null),
    value: () => null,
  },
  {
    key: 'btts', label: 'BTTS', unit: '% BTTS', pct: true,
    avg: (f) => f.btts_pct,
    odds: (f) => f.btts_odds,
    value: (f) => f.value.btts,
  },
];

/** Fold remaining diacritics for pure-English display (names are pre-folded; leagues here). */
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/Þ/g, 'Th').replace(/þ/g, 'th').replace(/Ð/g, 'D').replace(/ð/g, 'd')
  .replace(/Ø/g, 'O').replace(/ø/g, 'o').replace(/Æ/g, 'Ae').replace(/æ/g, 'ae')
  .replace(/Å/g, 'A').replace(/å/g, 'a');

function ValueBadge({ cell }: { cell: ValueCell }) {
  if (!cell?.flag) return null;
  const strong = cell.flag === 'strong';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${strong ? 'bg-gold/20 text-gold' : 'bg-emerald-500/20 text-emerald-300'}`}>
      {strong ? "Gaffer's banker" : "Gaffer likes"}
    </span>
  );
}

type GafferPick = { mode: 'value' | 'banker'; f: Fixture; cell: NonNullable<ValueCell> } | null;

/** The Gaffer's call for the active market — a value pick, or (quiet days) his banker. */
function GafferBanner({ pick, label, mark }: { pick: GafferPick; label: string; mark: string | null }) {
  if (!pick) {
    return (
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60 backdrop-blur-md">
        <span className="font-display tracking-wide text-gold">THE GAFFER'S {label.toUpperCase()} CALL</span> — nothing worth backing here today. He's sitting on his hands.
      </div>
    );
  }
  const { mode, f, cell } = pick;
  const banker = mode === 'banker';
  return (
    <div
      className={`relative mb-4 overflow-hidden rounded-2xl border px-4 py-3.5 backdrop-blur-md ${
        banker
          ? 'border-violet-400/40 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent shadow-[0_0_40px_-18px_rgba(139,92,246,0.7)]'
          : 'border-gold/40 bg-gradient-to-r from-[#1a1003] via-[#160c04] to-[#0d0703] shadow-[0_0_40px_-16px_hsl(var(--gold))]'
      }`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${banker ? 'bg-violet-500/20' : 'bg-gold/10'}`} />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Flame className={`h-6 w-6 shrink-0 ${banker ? 'text-violet-300' : 'text-gold'}`} />
          <div className="min-w-0">
            <div className={`font-display text-sm tracking-wide ${banker ? 'text-violet-200' : 'text-gold'}`}>
              {banker ? `NO VALUE TODAY · THE GAFFER'S ${label.toUpperCase()} BANKER` : `THE GAFFER'S ${label.toUpperCase()} PICK`}
            </div>
            <div className="font-bold leading-tight text-white">{f.home.name} <span className="text-white/40">v</span> {f.away.name}</div>
            <div className="truncate text-xs text-white/50">
              {banker ? 'Strongest form on the card' : 'The price is wrong — value'} · {f.region} · {fold(f.league)}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-display text-xl ${banker ? 'text-violet-100' : 'text-white'}`}>{label === 'BTTS' ? 'BTTS' : `Over ${mark} ${label}`}</div>
          <div className="text-sm text-white/70">form <span className="text-emerald-400">{cell.prob}%</span> · odds <span className={banker ? 'text-violet-200' : 'text-gold'}>{odd(cell.odds)}</span></div>
        </div>
      </div>
    </div>
  );
}

const odd = (o: number | null) => (o ? o.toFixed(2) : '—');
const formString = (games: FormGame[]) => games.slice(0, 5).map((g) => g.res).reverse().join('');

export default function FormTables() {
  const [cat, setCat] = useState<CatKey>('corners');
  const [markIdx, setMarkIdx] = useState(1);
  const [league, setLeague] = useState<string>('all');
  const [selected, setSelected] = useState<Fixture | null>(null);

  useEffect(() => { document.title = 'Form Tables — Footy Oracle Club'; }, []);

  const { data: tables, live } = useFormTablesData();
  const C = CATS.find((c) => c.key === cat)!;
  const mark = C.marks?.[Math.min(markIdx, C.marks.length - 1)] ?? null;

  const rows = useMemo(() => {
    const list = tables.fixtures.filter((f) => league === 'all' || f.league === league);
    return [...list].sort((a, b) => C.avg(b) - C.avg(a));
  }, [league, C, tables]);

  // The Gaffer's pick = highest-edge flagged fixture for the active market/mark.
  // The Gaffer's call for the active market: a VALUE pick if the price is wrong,
  // otherwise (quiet days) his BANKER — the strongest form on the card.
  const gafferPick = useMemo(() => {
    const scored = rows
      .map((f) => ({ f, cell: C.value(f, mark) }))
      .filter((x): x is { f: Fixture; cell: NonNullable<ValueCell> } => !!x.cell && x.cell.odds != null);
    const flagged = [...scored].filter((x) => x.cell.flag).sort((a, b) => b.cell.edge - a.cell.edge);
    if (flagged[0]) return { mode: 'value' as const, f: flagged[0].f, cell: flagged[0].cell };
    // No value: fall back to the banker — highest form %, then best odds.
    const banker = [...scored].sort((a, b) => b.cell.prob - a.cell.prob || (b.cell.odds ?? 0) - (a.cell.odds ?? 0))[0];
    return banker ? { mode: 'banker' as const, f: banker.f, cell: banker.cell } : null;
  }, [rows, C, mark]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070310] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(circle_at_15%_-5%,rgba(88,28,135,0.35),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,0.18),transparent_40%)]" />
      <HomepageNav />

      <main className="relative mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-8">
        <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div className="mb-4">
          <div className="flex items-center gap-2.5">
            <Flame className="h-7 w-7 text-emerald-400 md:h-8 md:w-8" />
            <h1 className="font-display text-3xl tracking-tight text-white md:text-5xl">FORM TABLES</h1>
          </div>
          <p className="mt-1 text-sm text-white/60 md:text-base">
            Every fixture ranked by the two teams' <span className="text-white">combined average</span>. Highest on top.
          </p>
          <p className="mt-1 text-xs text-white/40">
            {live
              ? "Today's slate · refreshed 3am UK from live form."
              : 'Upcoming fixtures on real form — live 3am UK auto-refresh at launch.'}
          </p>
        </div>

        {/* Category tabs */}
        <div className="mb-3 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setMarkIdx(1); }}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${cat === c.key ? 'bg-emerald-500 text-[#04140d]' : 'border border-white/12 bg-white/[0.05] text-white/75 hover:bg-white/[0.09]'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {C.marks ? (
            <div className="inline-flex overflow-hidden rounded-xl border border-white/12">
              {C.marks.map((ln, i) => (
                <button
                  key={ln}
                  onClick={() => setMarkIdx(i)}
                  className={`px-4 py-1.5 text-sm font-bold transition-colors ${i === markIdx ? 'bg-emerald-500/90 text-[#04140d]' : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'}`}
                >
                  Over {ln}
                </button>
              ))}
            </div>
          ) : <span />}

          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="rounded-xl border border-white/12 bg-[#140a26] px-3 py-2 text-sm font-semibold text-white outline-none"
          >
            <option value="all">All leagues</option>
            {tables.leagues.map((l) => <option key={`${l.region}-${l.name}`} value={l.name}>{l.region} · {l.name}</option>)}
          </select>
        </div>

        {/* The Gaffer's selection for this market */}
        <GafferBanner pick={gafferPick} label={C.label} mark={mark} />

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-white/[0.03] backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white/45 md:gap-3 md:px-4">
            <span className="w-4 text-center md:w-5">#</span>
            <span className="w-[42px] md:w-[56px]" />
            <span className="flex-1">Fixture</span>
            {C.over && <span className="hidden w-14 text-right sm:block">Over {mark}</span>}
            <span className="w-11 text-right md:w-14">Odds</span>
            <span className="w-12 text-right md:w-14">Avg</span>
            <span className="w-10 text-right md:w-12">KO</span>
            <span className="w-3.5 md:w-4" />
          </div>

          {rows.map((f, i) => {
            const overPct = C.over ? C.over(f, mark!) : null;
            const o = C.odds(f, mark);
            const isPick = gafferPick?.f.id === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className={`flex w-full items-center gap-2 border-b border-white/8 px-3 py-2.5 text-left transition-colors last:border-0 md:gap-3 md:px-4 ${
                  isPick
                    ? 'bg-violet-500/[0.16] ring-1 ring-inset ring-violet-400/40 backdrop-blur-md hover:bg-violet-500/25'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <span className={`w-4 shrink-0 text-center font-display text-base md:w-5 md:text-lg ${isPick ? 'text-violet-300' : i < 3 ? 'text-gold' : 'text-white/40'}`}>{i + 1}</span>
                <div className="flex w-[42px] shrink-0 -space-x-2 md:w-[56px] md:-space-x-1.5">
                  <TeamAvatar name={f.home.name} logoUrl={f.home.logo} size={24} />
                  <TeamAvatar name={f.away.name} logoUrl={f.away.logo} size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold leading-tight text-white md:text-base">{f.home.name} <span className="text-white/40">v</span> {f.away.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {isPick && <span className="shrink-0 rounded bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-200">Gaffer's {gafferPick?.mode === 'banker' ? 'banker' : 'pick'}</span>}
                    <span className="truncate text-[11px] text-white/45 md:text-xs">{f.region} · {fold(f.league)}</span>
                  </div>
                </div>
                {C.over && (
                  <div className="hidden w-14 shrink-0 text-right sm:block">
                    <div className="text-sm font-bold text-white">{overPct != null ? `${overPct}%` : '—'}</div>
                    <div className="text-[10px] text-white/45">form</div>
                  </div>
                )}
                <div className="w-11 shrink-0 text-right md:w-14">
                  <div className="text-sm font-bold text-gold">{odd(o)}</div>
                  <div className="text-[10px] text-white/45">odds</div>
                </div>
                <div className="w-12 shrink-0 text-right md:w-14">
                  <div className="font-display text-base leading-none text-emerald-400 md:text-2xl">{C.pct ? `${C.avg(f)}%` : C.avg(f).toFixed(1)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/40">avg</div>
                </div>
                <div className="w-10 shrink-0 text-right md:w-12">
                  <div className="text-xs font-semibold text-white/90 md:text-sm">{f.time}</div>
                  <div className="text-[10px] text-white/40">KO</div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 ${isPick ? 'text-violet-300' : 'text-white/30'}`} />
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-white/50">No fixtures for this selection.</div>
          )}
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-white/40">
          <Info className="h-3.5 w-3.5" /> Odds are bookmaker decimals. Tap any fixture for H2H, both teams' form and the full market breakdown.
        </p>

        {/* The Gaffer's picks + reasoning, below the tables */}
        <div className="mt-8">
          <GafferPicksBox />
        </div>
      </main>

      <div className="mx-auto max-w-5xl px-3 pb-8 md:px-6"><FooterNavigation /></div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-white/10 bg-[#0b0617] p-0 text-white sm:max-w-lg">
          {selected && <FixtureDetail f={selected} cat={cat} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Drill-down ──────────────────────────────────────────────────────── */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <div className="font-display text-2xl text-emerald-400">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/45">{label}</div>
    </div>
  );
}

function FormList({ title, games }: { title: string; games: FormGame[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-white">{title}</span>
        <FormStrip form={formString(games)} size="md" />
      </div>
      <div className="space-y-1">
        {games.slice(0, 5).map((g, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs">
            <span className={`w-4 text-center font-bold ${g.res === 'W' ? 'text-success' : g.res === 'L' ? 'text-destructive' : 'text-amber-400'}`}>{g.res}</span>
            <span className="text-white/50">{g.ha}</span>
            <span className="flex-1 truncate text-white/80">{g.opp}</span>
            <span className="font-semibold text-white">{g.gf}-{g.ga}</span>
            <span className="w-12 text-right text-white/45">{g.corners} cnr</span>
            <span className="w-12 text-right text-white/45">{g.cards} cd</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FixtureDetail({ f, cat }: { f: Fixture; cat: CatKey }) {
  const C = CATS.find((c) => c.key === cat)!;
  return (
    <div>
      <SheetHeader className="border-b border-white/10 bg-gradient-to-br from-emerald-950/40 to-[#0b0617] p-5">
        <SheetTitle className="text-white">
          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1"><TeamAvatar name={f.home.name} logoUrl={f.home.logo} size={40} /><span className="text-xs">{f.home.short}</span></div>
            <span className="font-display text-xl text-white/50">v</span>
            <div className="flex flex-col items-center gap-1"><TeamAvatar name={f.away.name} logoUrl={f.away.logo} size={40} /><span className="text-xs">{f.away.short}</span></div>
          </div>
          <div className="mt-2 text-center text-sm font-normal text-white/60">{f.home.name} v {f.away.name}</div>
          <div className="text-center text-xs font-normal text-white/40">{f.region} · {fold(f.league)} · {f.date}</div>
        </SheetTitle>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">Combined averages</h3>
          <div className="grid grid-cols-4 gap-2">
            <StatTile label="goals" value={f.goals_avg.toFixed(1)} />
            <StatTile label="corners" value={f.corners_avg.toFixed(1)} />
            <StatTile label="cards" value={f.cards_avg.toFixed(1)} />
            <StatTile label="BTTS" value={`${f.btts_pct}%`} />
          </div>
        </section>

        {/* Market breakdown — form % + odds + value per mark */}
        {C.marks && (
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">{C.label} — odds & value</h3>
            <div className="space-y-1.5">
              {C.marks.map((ln) => {
                const pct = C.over ? C.over(f, ln) : null;
                const cell = C.value(f, ln);
                return (
                  <div key={ln} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="w-16 font-bold text-white">Over {ln}</span>
                    <span className="w-14 text-emerald-400">{pct != null ? `${pct}%` : '—'}</span>
                    <span className="w-14 font-bold text-gold">{odd(C.odds(f, ln))}</span>
                    <span className="flex-1 text-right">{cell?.flag ? <ValueBadge cell={cell} /> : null}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {f.h2h.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">Head to head</h3>
            <div className="space-y-1">
              {f.h2h.map((h, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs">
                  <span className="w-16 text-white/40">{h.date}</span>
                  <span className="flex-1 truncate text-white/80">{h.home} v {h.away}</span>
                  <span className="font-bold text-white">{h.hg}-{h.ag}</span>
                  <span className="w-12 text-right text-white/45">{h.corners} cnr</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-white/50">Recent form</h3>
          <FormList title={f.home.name} games={f.home_form} />
          <FormList title={f.away.name} games={f.away_form} />
        </section>
      </div>
    </div>
  );
}
