import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, ChevronDown, Flame, Info } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { TeamAvatar } from '@/components/TeamAvatar';
import { FormStrip } from '@/components/FormStrip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useInPlay, type InPlayState } from '@/components/homepage/useInPlay';
import { useLiveScores, matchLive, type LiveScore } from '@/components/homepage/useLiveScores';
import { supabase } from '@/integrations/supabase/client';
import raw from '@/data/formTablesData.json';
import type { FormFixtureRow as Fixture, FormValueCell, FormValueFlag, FormGame } from '@/types/footy';

type ValueCell = FormValueCell | null;
type TablesPayload = { leagues: { name: string; region: string }[]; fixtures: Fixture[] };
const SNAPSHOT = raw as unknown as TablesPayload;

/**
 * Is a live payload healthy enough to trust? A stale/broken build shows up as
 * unresolved league labels ("League 16696"). If most fixtures lack a real league
 * name we fall back to the bundled slate rather than render the broken feed.
 */
function isHealthy(p: TablesPayload | null): p is TablesPayload {
  const fx = p?.fixtures ?? [];
  if (fx.length === 0) return false;
  const named = fx.filter((f) => f.league && !/^League\s*\d+$/i.test(String(f.league))).length;
  return named / fx.length >= 0.6;
}

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
  // Use the live feed only when it's healthy; otherwise the bundled slate.
  return isHealthy(data ?? null) ? { data: data!, live: true } : { data: SNAPSHOT, live: false };
}

/* ── Category config — over + under per market ───────────────────────── */
type CatKey = 'corners' | 'goals' | 'cards' | 'btts';
interface Cat {
  key: CatKey; label: string; pct?: boolean;
  overMarks?: string[]; underMarks?: string[];
  avg: (f: Fixture) => number;
  overPctAt: (f: Fixture, mark: string | null) => number | null;  // OVER % at a mark
  overOdds: (f: Fixture, mark: string | null) => number | null;
  underOdds: (f: Fixture, mark: string | null) => number | null;
}
const CATS: Cat[] = [
  {
    key: 'corners', label: 'Corners',
    overMarks: ['8.5', '9.5', '10.5', '11.5'], underMarks: ['8.5', '9.5', '10.5', '11.5'],
    avg: (f) => f.corners_avg,
    overPctAt: (f, m) => (m ? f.corners_over[m] ?? null : null),
    overOdds: (f, m) => (m ? f.corners_odds[m] ?? null : null),
    underOdds: (f, m) => (m ? f.corners_under_odds?.[m] ?? null : null),
  },
  {
    key: 'goals', label: 'Goals',
    overMarks: ['2.5', '3.5', '4.5'], underMarks: ['0.5', '1.5', '2.5', '3.5'],
    avg: (f) => f.goals_avg,
    overPctAt: (f, m) => (m ? f.goals_over[m] ?? null : null),
    overOdds: (f, m) => (m ? f.goals_odds[m] ?? null : null),
    underOdds: (f, m) => (m ? f.goals_under_odds?.[m] ?? null : null),
  },
  {
    key: 'cards', label: 'Cards',
    overMarks: ['3.5', '4.5', '5.5'], underMarks: ['2.5', '3.5', '4.5'],
    avg: (f) => f.cards_avg,
    overPctAt: (f, m) => (m ? f.cards_over?.[m] ?? null : null),
    overOdds: (f, m) => (m ? f.cards_odds[m] ?? null : null),
    underOdds: (f, m) => (m ? f.cards_under_odds?.[m] ?? null : null),
  },
  {
    key: 'btts', label: 'BTTS', pct: true,
    avg: (f) => f.btts_pct,
    overPctAt: (f) => f.btts_pct,
    overOdds: (f) => f.btts_odds,
    underOdds: (f) => f.btts_no_odds ?? null,
  },
];

/** Value cell from a probability + odds — mirrors the edge assembler. */
function computeValue(prob: number | null, odds: number | null): ValueCell {
  if (prob == null || !odds || odds <= 1) return null;
  const implied = Math.round(1000 / odds) / 10;
  const edge = Math.round((prob - implied) * 10) / 10;
  const flag: FormValueFlag = edge >= 20 ? 'strong' : edge >= 10 && odds >= 1.5 ? 'value' : null;
  return { prob, odds, implied, edge, flag };
}

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

type GafferDaily = {
  mode: 'value' | 'banker'; f: Fixture; catKey: CatKey;
  label: string; selection: string; prob: number; odds: number; edge: number;
} | null;

/**
 * The Gaffer's ONE pick of the day — computed once across every market on
 * today's card, not per-tab. A genuine value pick if the price is wrong,
 * else his strongest-form banker at a fair price. The same single call shows
 * regardless of which table you're viewing (it never re-picks per market).
 */
function pickGafferDaily(fixtures: Fixture[], today: string): GafferDaily {
  type Cand = { f: Fixture; catKey: CatKey; label: string; selection: string; line: number; prob: number; odds: number; edge: number; flag: FormValueFlag };
  const cands: Cand[] = [];
  for (const f of fixtures) {
    if (f.date !== today) continue;
    for (const C of CATS) {
      for (const mk of C.overMarks ?? [null]) {
        const cell = computeValue(C.overPctAt(f, mk), C.overOdds(f, mk));
        if (!cell || cell.odds == null) continue;
        cands.push({
          f, catKey: C.key, label: C.label,
          selection: C.pct ? 'BTTS – Yes' : `Over ${mk} ${C.label}`,
          line: mk ? Number(mk) : 0, prob: cell.prob, odds: cell.odds, edge: cell.edge, flag: cell.flag,
        });
      }
    }
  }
  const pick = (c: Cand, mode: 'value' | 'banker'): GafferDaily =>
    ({ mode, f: c.f, catKey: c.catKey, label: c.label, selection: c.selection, prob: c.prob, odds: c.odds, edge: c.edge });
  const flagged = cands.filter((c) => c.flag).sort((a, b) => b.edge - a.edge);
  if (flagged[0]) return pick(flagged[0], 'value');
  // No edge today → strongest form at a fair price; highest line preferred so
  // it reads as a real call (e.g. Over 11.5 Corners), not a 1.05 near-certainty.
  const banker = cands
    .filter((c) => c.prob >= 65 && c.odds >= 1.4)
    .sort((a, b) => b.prob - a.prob || b.line - a.line || b.odds - a.odds)[0];
  return banker ? pick(banker, 'banker') : null;
}

/** One clean "Gaffer's Pick of the Day" strip — the same call on every tab. */
function GafferPickCard({ pick }: { pick: GafferDaily }) {
  if (!pick) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-3.5 text-sm text-white/75">
        <Flame className="h-5 w-5 shrink-0 text-white/40" />
        <span><span className="font-bold text-white">No bet today.</span> Nowt on the card worth your money — the Gaffer sits it out. Back tomorrow.</span>
      </div>
    );
  }
  const { f, selection, prob, odds, mode } = pick;
  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-violet-400/40 bg-gradient-to-r from-violet-600/25 via-violet-600/10 to-transparent px-4 py-4 shadow-[0_20px_50px_-24px_rgba(139,92,246,0.9)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/20 ring-1 ring-inset ring-violet-400/40">
            <Flame className="h-5 w-5 text-violet-200" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-200">
              The Gaffer's pick of the day · {mode === 'banker' ? 'banker' : 'value'}
            </div>
            <div className="text-base font-bold leading-tight text-white">{f.home.name} <span className="text-white/40">v</span> {f.away.name}</div>
            <div className="truncate text-xs text-white/60">{f.region} · {fold(f.league)}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg text-white md:text-xl">{selection}</div>
          <div className="text-sm text-white/70">form <span className="font-bold text-emerald-300">{prob}%</span> · odds <span className="font-bold text-[#f8e7a1]">{odd(odds)}</span></div>
        </div>
      </div>
    </div>
  );
}

const odd = (o: number | null) => (o ? o.toFixed(2) : '—');
const formString = (games: FormGame[]) => games.slice(0, 5).map((g) => g.res).reverse().join('');

/** YYYY-MM-DD n days after an ISO date (UTC-noon to dodge DST). */
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Human "when" for a fixture date, relative to today. */
const whenLabel = (dateStr: string, todayStr: string) => {
  if (dateStr === todayStr) return 'Today';
  if (dateStr === addDays(todayStr, 1)) return 'Tmrw';
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const NO_GAMES_LINES = [
  "Nowt on today, lads. None of our leagues are out — I'm not making one up just to fill the page.",
  "Quiet one today — no games worth the Gaffer's eye. Empty card beats a made-up one.",
  "No football on our leagues today. I'll not have you backing thin air. Back when there's a ball rolling.",
  "Rest day for the Gaffer. Nothing on today — the form tables fire back up the moment there's a game.",
];

/** Premium fallback when there are no fixtures today — the Gaffer, straight up. */
function GafferNoGames() {
  const line = NO_GAMES_LINES[new Date().getDate() % NO_GAMES_LINES.length];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-violet-600/15 via-white/[0.04] to-transparent p-8 text-center backdrop-blur-xl shadow-[0_0_60px_-30px_rgba(139,92,246,0.6)]">
      <div className="pointer-events-none absolute -top-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-black/40">
        <Flame className="h-7 w-7 text-gold" />
      </div>
      <h2 className="relative font-display text-2xl uppercase tracking-tight text-white md:text-3xl">No games today</h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/70 md:text-base">“{line}”</p>
    </div>
  );
}

/* ── Value board — best value per bet type, below the tables ───────────── */
type ValueSel = {
  f: Fixture; catKey: CatKey; label: string; selection: string;
  line: number | null; under: boolean; prob: number; odds: number; edge: number; flag: FormValueFlag;
};

/** Value selections for the ACTIVE market (cat + over/under + line), best edge first. */
function activeValueList(fixtures: Fixture[], C: Cat, underMode: boolean, mark: string | null): ValueSel[] {
  const out: ValueSel[] = [];
  for (const f of fixtures) {
    const over = C.overPctAt(f, mark);
    const pct = over == null ? null : underMode ? Math.round((100 - over) * 10) / 10 : over;
    const odds = underMode ? C.underOdds(f, mark) : C.overOdds(f, mark);
    const cell = computeValue(pct, odds);
    if (!cell || !cell.flag) continue;
    const selection = C.pct
      ? (underMode ? 'BTTS No' : 'BTTS – Yes')
      : `${underMode ? 'Under' : 'Over'} ${mark} ${C.label}`;
    out.push({ f, catKey: C.key, label: C.label, selection, line: mark ? Number(mark) : null, under: underMode, prob: cell.prob, odds: cell.odds, edge: cell.edge, flag: cell.flag });
  }
  return out.sort((a, b) => b.edge - a.edge);
}

const lineFromSelection = (s: string): number | null => {
  const m = /(\d+(?:\.\d+)?)/.exec(s);
  return m ? Number(m[1]) : null;
};

type VStatus = { state: 'live' | 'ft'; result?: 'won' | 'lost'; landed?: boolean; text: string };

function settleMarket(catKey: CatKey, line: number | null, under: boolean, ip: InPlayState): 'won' | 'lost' | null {
  if (catKey === 'btts') { const both = ip.homeGoals > 0 && ip.awayGoals > 0; return (under ? !both : both) ? 'won' : 'lost'; }
  const metric = catKey === 'corners' ? ip.corners : catKey === 'cards' ? ip.cards : ip.goals;
  if (metric == null || line == null) return null;
  const over = metric > line;
  return (under ? !over : over) ? 'won' : 'lost';
}

/** Time-based in-play (today only) — enables live polling + falls back when no score. */
function fixtureLive(time: string, date: string, today: string): boolean {
  if (date !== today) return false;
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!m) return false;
  const uk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const nowMin = uk.getHours() * 60 + uk.getMinutes();
  const ko = Number(m[1]) * 60 + Number(m[2]);
  return nowMin >= ko && nowMin < ko + 160;
}

function valueStatus(sel: ValueSel, ip: InPlayState | undefined, live: LiveScore | undefined, today: string): VStatus | null {
  // Finished — settle Won/Lost from FootyStats final numbers.
  if (ip?.ended) return { state: 'ft', result: settleMarket(sel.catKey, sel.line, sel.under, ip) ?? undefined, text: `FT ${ip.homeGoals}–${ip.awayGoals}` };
  // Real live score from API-Football.
  if (live) {
    const score = `${live.gh}–${live.ga}`;
    const clock = live.status === 'HT' ? 'HT' : live.elapsed != null ? `${live.elapsed}'` : 'LIVE';
    const total = live.gh + live.ga;
    const landed = !sel.under && sel.catKey === 'goals' && sel.line != null ? total > sel.line
      : !sel.under && sel.catKey === 'btts' ? live.gh > 0 && live.ga > 0
      : false;
    return { state: 'live', landed, text: `${clock} · ${score}` };
  }
  if (fixtureLive(sel.f.time, sel.f.date, today)) return { state: 'live', text: 'In Play' };
  return null;
}

function ValueSelBox({ sel, ip, liveList, today, gaffer }: { sel: ValueSel; ip?: InPlayState; liveList?: LiveScore[]; today: string; gaffer?: boolean }) {
  const st = valueStatus(sel, ip, matchLive(sel.f.home.name, sel.f.away.name, liveList), today);
  return (
    <div className={`card-3d rounded-2xl p-3.5 ${gaffer ? 'ring-1 ring-inset ring-violet-400/45' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 -space-x-1.5">
            <TeamAvatar name={sel.f.home.name} logoUrl={sel.f.home.logo} size={26} className="rounded-md ring-1 ring-black/50" />
            <TeamAvatar name={sel.f.away.name} logoUrl={sel.f.away.logo} size={26} className="rounded-md ring-1 ring-black/50" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold leading-tight text-white text-emboss">{sel.f.home.name} <span className="text-white/30">v</span> {sel.f.away.name}</div>
            <div className="truncate text-[10px] text-white/45">{gaffer ? "The Gaffer's pick · " : ''}{sel.f.region} · {fold(sel.f.league)}</div>
          </div>
        </div>
        {st ? (
          st.state === 'ft' ? (
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${st.result === 'won' ? 'border-emerald-400/55 bg-emerald-500/15 text-emerald-200' : st.result === 'lost' ? 'border-rose-400/55 bg-rose-500/15 text-rose-200' : 'border-white/20 bg-white/[0.06] text-white/70'}`}>
              {st.text}{st.result === 'won' ? ' · Won ✓' : st.result === 'lost' ? ' · Lost' : ''}
            </span>
          ) : (
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${st.landed ? 'border-emerald-400/55 bg-emerald-500/15 text-emerald-200' : 'border-rose-400/55 bg-rose-500/15 text-rose-200'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${st.landed ? 'bg-emerald-400' : 'bg-rose-400'} [animation:pulse_1.4s_ease-in-out_infinite]`} />
              {st.text}
            </span>
          )
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white/60">
            {whenLabel(sel.f.date, today)} · {sel.f.time}
          </span>
        )}
      </div>
      <div className="inset-3d mt-2.5 flex items-center justify-between gap-2 rounded-xl px-3 py-2">
        <div className="min-w-0">
          <div className={`text-[9px] font-black uppercase tracking-[0.16em] ${gaffer ? 'text-violet-300' : 'text-emerald-300/85'}`}>{gaffer ? 'Gaffer value pick' : 'Value pick'}</div>
          <div className="truncate font-display text-base uppercase tracking-tight text-white text-extrude">{sel.selection}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-xl leading-none text-[#f5c542] text-extrude">{odd(sel.odds)}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/55">Odds</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-white/65">
        <span className="inline-flex items-center gap-1">Form <b className="text-white">{sel.prob}%</b></span>
        <span className={`ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${sel.flag === 'strong' ? 'bg-[#f5c542]/15 text-[#f8e7a1] ring-1 ring-inset ring-[#f5c542]/30' : 'bg-emerald-500/12 text-emerald-300 ring-1 ring-inset ring-emerald-400/25'}`}>+{sel.edge.toFixed(1)}% edge</span>
      </div>
    </div>
  );
}

function ValueHeading({ selection }: { selection: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-2xl uppercase tracking-tight text-white md:text-3xl">Best Value · <span className="text-emerald-400">{selection}</span></h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/55">
        The Gaffer's crunched every fixture so you don't have to — the biggest-value games for this market, juiciest edge first. <span className="text-white/75">His numbers, not a calculator's.</span>
      </p>
    </div>
  );
}

function ValueBoard({ fixtures, C, underMode, mark, selection, gafferPick, today }: {
  fixtures: Fixture[]; C: Cat; underMode: boolean; mark: string | null; selection: string; gafferPick: GafferDaily; today: string;
}) {
  const list = useMemo(() => activeValueList(fixtures, C, underMode, mark), [fixtures, C, underMode, mark]);
  const showGaffer = !!gafferPick && gafferPick.catKey === C.key;
  const shownList = useMemo(
    () => (showGaffer ? list.filter((v) => v.f.id !== gafferPick!.f.id) : list),
    [list, showGaffer, gafferPick],
  );

  const ids = useMemo(() => {
    const s = new Set<string>();
    list.forEach((v) => s.add(String(v.f.id)));
    if (gafferPick) s.add(String(gafferPick.f.id));
    return [...s];
  }, [list, gafferPick]);
  const { data: inplay } = useInPlay(ids);
  // Real live scores — only poll when one of these selections is in its window.
  const anyLive = useMemo(
    () => list.some((v) => fixtureLive(v.f.time, v.f.date, today)) || (!!gafferPick && fixtureLive(gafferPick.f.time, gafferPick.f.date, today)),
    [list, gafferPick, today],
  );
  const { data: liveList } = useLiveScores(anyLive);

  const gafferSel: ValueSel | null = showGaffer ? {
    f: gafferPick!.f, catKey: gafferPick!.catKey, label: gafferPick!.label, selection: gafferPick!.selection,
    line: lineFromSelection(gafferPick!.selection), under: false, prob: gafferPick!.prob, odds: gafferPick!.odds, edge: gafferPick!.edge, flag: 'strong',
  } : null;

  return (
    <section className="mt-8">
      <ValueHeading selection={selection} />
      {shownList.length === 0 && !gafferSel ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-5 text-sm text-white/45">
          No value on <span className="text-white/70">{selection}</span> right now — the Gaffer's not forcing one. Try another line or market.
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {gafferSel && <ValueSelBox sel={gafferSel} ip={inplay?.[String(gafferSel.f.id)]} liveList={liveList} today={today} gaffer />}
          {shownList.map((v) => <ValueSelBox key={`${v.catKey}-${v.f.id}`} sel={v} ip={inplay?.[String(v.f.id)]} liveList={liveList} today={today} />)}
        </div>
      )}
    </section>
  );
}

export default function FormTables() {
  const [params] = useSearchParams();
  // Deep-link support: /form-tables?cat=goals&mode=under&mark=2.5 (from the homepage tiles)
  const spCat = params.get('cat');
  const initCat: CatKey = (['corners', 'goals', 'cards', 'btts'].includes(spCat ?? '') ? spCat : 'corners') as CatKey;
  const initUnder = params.get('mode') === 'under';
  const initMarkIdx = (() => {
    const c = CATS.find((x) => x.key === initCat);
    if (!c || c.pct) return 1;
    const arr = (initUnder ? c.underMarks : c.overMarks) ?? [];
    const i = arr.indexOf(params.get('mark') ?? '');
    return i >= 0 ? i : Math.min(1, arr.length - 1);
  })();

  const [cat, setCat] = useState<CatKey>(initCat);
  const [underMode, setUnderMode] = useState(initUnder);
  const [markIdx, setMarkIdx] = useState(initMarkIdx);
  const [league, setLeague] = useState<string>('all');
  const [selected, setSelected] = useState<Fixture | null>(null);

  useEffect(() => { document.title = 'Form Tables — Footy Oracle Club'; }, []);

  const { data: tables } = useFormTablesData();
  const C = CATS.find((c) => c.key === cat)!;
  const marks = underMode ? C.underMarks : C.overMarks;
  const mark = marks?.[Math.min(markIdx, marks.length - 1)] ?? null;

  // Active-mode numbers per fixture: under-% = 100 − over-%; over/under odds.
  const pctFor = (f: Fixture) => {
    const o = C.overPctAt(f, mark);
    return o == null ? null : underMode ? Math.round((100 - o) * 10) / 10 : o;
  };
  const oddsFor = (f: Fixture) => (underMode ? C.underOdds(f, mark) : C.overOdds(f, mark));
  const overUnder = underMode ? 'Under' : 'Over';
  const selection = C.pct ? (underMode ? 'BTTS No' : 'BTTS Yes') : `${overUnder} ${mark} ${C.label}`;

  // TODAY only (UK date). Snapshot dates are real fixture dates.
  const today = useMemo(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }), []);
  // 3-day window: today, tomorrow, day after — today's games highlighted.
  const windowDates = useMemo(() => [0, 1, 2].map((n) => addDays(today, n)), [today]);

  const rows = useMemo(() => {
    // Rank by the SELECTED line's form probability (over-% or, in unders, the
    // under-%). Highest on top = best stats for the exact market you picked, so
    // switching 2.5 → 3.5 → 4.5 re-ranks and re-numbers the table.
    const prob = (f: Fixture) => {
      const o = C.overPctAt(f, mark);
      if (o == null) return -1;
      return underMode ? Math.round((100 - o) * 10) / 10 : o;
    };
    const inWindow = tables.fixtures.filter(
      (f) => windowDates.includes(f.date) && (league === 'all' || f.league === league) && prob(f) >= 0,
    );
    // Top 20 overall for the selected category/line, best form first.
    return [...inWindow].sort((a, b) => prob(b) - prob(a)).slice(0, 20);
  }, [league, C, tables, windowDates, underMode, mark]);

  // The Gaffer's ONE pick of the day — computed once across every market on
  // today's card (not per-tab). Highlighted in the table only within its market.
  const gafferPick = useMemo(() => pickGafferDaily(tables.fixtures, today), [tables, today]);

  // Fixtures the value board considers — same window + league filter as the table.
  const valueFixtures = useMemo(
    () => tables.fixtures.filter((f) => windowDates.includes(f.date) && (league === 'all' || f.league === league)),
    [tables, windowDates, league],
  );

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
            <Flame className="h-6 w-6 text-emerald-400/90 md:h-7 md:w-7" />
            <h1 className="font-display text-2xl tracking-tight text-white md:text-4xl">FORM TABLES</h1>
          </div>
          <p className="mt-1 text-sm text-white/60 md:text-base">
            The <span className="text-white">top 20</span> ranked by <span className="text-white">form probability for the line you pick</span>. Highest on top.
          </p>
          <p className="mt-1 text-[13px] text-white/55">Next 3 days · <span className="font-semibold text-emerald-300">today's games highlighted</span> · the Gaffer's pick in <span className="font-semibold text-violet-300">purple</span>.</p>
        </div>

        {rows.length === 0 ? (
          <GafferNoGames />
        ) : (
        <>
        {/* Market controls — category + league, then overs/unders + line */}
        <div className="mb-4 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {CATS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => { setCat(c.key); setMarkIdx(1); }}
                  className={`rounded-xl px-3.5 py-1.5 text-sm font-bold transition-all md:px-4 ${cat === c.key ? 'bg-emerald-500 text-[#04140d] shadow-[0_6px_18px_-8px_rgba(16,185,129,0.9)]' : 'text-white/55 hover:text-white'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <select
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                className="appearance-none rounded-xl border border-white/12 bg-[#140a26] py-2 pl-3 pr-9 text-sm font-semibold text-white outline-none transition-colors hover:border-white/25"
              >
                <option value="all">All leagues</option>
                {tables.leagues.map((l) => <option key={`${l.region}-${l.name}`} value={l.name}>{l.region} · {l.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
              {[false, true].map((u) => (
                <button
                  key={String(u)}
                  onClick={() => { setUnderMode(u); setMarkIdx(1); }}
                  className={`rounded-xl px-4 py-1.5 text-sm font-black uppercase tracking-wide transition-all ${underMode === u ? 'bg-emerald-500 text-[#04140d] shadow-[0_6px_18px_-8px_rgba(16,185,129,0.9)]' : 'text-white/55 hover:text-white'}`}
                >
                  {u ? 'Unders' : 'Overs'}
                </button>
              ))}
            </div>
            {marks ? (
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
                {marks.map((ln, i) => (
                  <button
                    key={ln}
                    onClick={() => setMarkIdx(i)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-all ${i === markIdx ? 'bg-emerald-500/90 text-[#04140d]' : 'text-white/55 hover:text-white'}`}
                  >
                    {overUnder} {ln}
                  </button>
                ))}
              </div>
            ) : <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm font-bold text-white/70">{selection}</span>}
          </div>
        </div>

        {/* The Gaffer's one pick of the day — same call on every tab */}
        <GafferPickCard pick={gafferPick} />

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
            <span className="w-5 text-center">#</span>
            <span className="w-[40px]" />
            <span className="flex-1">Fixture</span>
            <span className="w-[46px] text-right">Avg</span>
            <span className="w-[50px] text-right">Form</span>
            <span className="w-[48px] text-right">When</span>
            <span className="hidden w-3.5 sm:block" />
          </div>

          <div className="divide-y divide-white/[0.06]">
          {rows.map((f, i) => {
            const formPct = pctFor(f);
            const o = oddsFor(f);
            const isPick = gafferPick?.f.id === f.id && gafferPick?.catKey === cat;
            const isToday = f.date === today;
            return (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className={`group flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                  isPick ? 'bg-violet-500/[0.045] hover:bg-violet-500/[0.08]' : 'hover:bg-white/[0.02]'
                }`}
              >
                <span className={`w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums ${isPick ? 'text-violet-300/75' : 'text-white/30'}`}>{i + 1}</span>
                <div className="flex w-[34px] shrink-0 -space-x-1.5">
                  <TeamAvatar name={f.home.name} logoUrl={f.home.logo} size={18} className="ring-1 ring-[#0b0617]" />
                  <TeamAvatar name={f.away.name} logoUrl={f.away.logo} size={18} className="ring-1 ring-[#0b0617]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium leading-tight text-white/75">{f.home.name} <span className="text-white/20">v</span> {f.away.name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-white/35">
                    {isPick ? (
                      <span className="shrink-0 font-semibold text-violet-300/65">Gaffer ·</span>
                    ) : isToday ? (
                      <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400/45" />
                    ) : null}
                    <span className="truncate">{f.region} · {fold(f.league)}</span>
                  </div>
                </div>
                {/* market average per game — always visible, with its unit */}
                <div className="w-[46px] shrink-0 text-right">
                  <div className="text-[12.5px] font-bold leading-none text-sky-300/90 tabular-nums">
                    {cat === 'btts' ? `${Math.round(C.avg(f))}%` : C.avg(f).toFixed(1)}
                  </div>
                  <div className="text-[8px] font-black uppercase leading-tight tracking-wide text-white/35">
                    {cat === 'btts' ? 'btts avg' : `${cat === 'corners' ? 'crn' : cat === 'goals' ? 'gls' : 'crd'}/game`}
                  </div>
                </div>
                <div className="w-[46px] shrink-0 text-right">
                  <div className={`font-display text-[13px] leading-none ${isPick ? 'text-violet-300/80' : 'text-emerald-400/65'}`}>{formPct != null ? `${formPct}%` : '—'}</div>
                  <div className="text-[10px] font-medium leading-tight text-[#f8e7a1]/50">{odd(o)}</div>
                </div>
                <div className="w-[44px] shrink-0 text-right">
                  <div className={`text-[11px] font-medium leading-tight ${isToday ? 'text-emerald-300/55' : 'text-white/50'}`}>{whenLabel(f.date, today)}</div>
                  <div className="text-[9px] leading-tight text-white/30">{f.time}</div>
                </div>
                <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-white/20 sm:block" />
              </button>
            );
          })}
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-white/45">
          <Info className="h-3.5 w-3.5" /> Odds are bookmaker decimals. Tap any fixture for H2H, both teams' form and the full market breakdown.
        </p>
        </>
        )}

        {/* Best value for the selected market — the Gaffer's numbers, biggest edge first */}
        <ValueBoard fixtures={valueFixtures} C={C} underMode={underMode} mark={mark} selection={selection} gafferPick={gafferPick} today={today} />
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

/** Per-team averages over their recent games (the form strips). */
function teamAvgs(games: FormGame[]) {
  if (!games.length) return null;
  const n = games.length;
  const sum = (fn: (g: FormGame) => number) => games.reduce((a, g) => a + fn(g), 0);
  return {
    goals: sum((g) => Number(g.gf ?? 0) + Number(g.ga ?? 0)) / n,
    corners: sum((g) => Number(g.corners ?? 0)) / n,
    cards: sum((g) => Number(g.cards ?? 0)) / n,
    btts: Math.round((100 * sum((g) => (g.btts ? 1 : 0))) / n),
    n,
  };
}

/** One market row: home avg | dual bar | away avg, with the combined figure. */
function HomeAwayRow({ label, home, away, combined, unit, active }: {
  label: string; home: number | null; away: number | null; combined: string; unit: string; active: boolean;
}) {
  const max = Math.max(home ?? 0, away ?? 0, 0.01);
  const fmt = (v: number | null) => (v == null ? '—' : unit === '%' ? `${Math.round(v)}%` : v.toFixed(1));
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${active ? 'border-[#f5c542]/45 bg-[#f5c542]/[0.06]' : 'border-white/8 bg-white/[0.03]'}`}>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
        <span className={active ? 'text-[#f8e7a1]' : 'text-white/50'}>{label}</span>
        <span className="text-white/45">combined <b className={active ? 'text-[#f8e7a1]' : 'text-white/80'}>{combined}</b></span>
      </div>
      <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
        <span className="text-right text-[14px] font-bold text-emerald-300 tabular-nums">{fmt(home)}</span>
        <div className="flex h-2 gap-0.5">
          <div className="flex flex-1 justify-end overflow-hidden rounded-l-full bg-black/40">
            <div className="h-full rounded-l-full bg-emerald-400/85" style={{ width: `${((home ?? 0) / max) * 100}%` }} />
          </div>
          <div className="flex flex-1 overflow-hidden rounded-r-full bg-black/40">
            <div className="h-full rounded-r-full bg-violet-400/85" style={{ width: `${((away ?? 0) / max) * 100}%` }} />
          </div>
        </div>
        <span className="text-[14px] font-bold text-violet-300 tabular-nums">{fmt(away)}</span>
      </div>
    </div>
  );
}

function FixtureDetail({ f, cat }: { f: Fixture; cat: CatKey }) {
  const C = CATS.find((c) => c.key === cat)!;
  const h = teamAvgs(f.home_form ?? []);
  const a = teamAvgs(f.away_form ?? []);
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
        {/* Averages per game — home vs away, every market, active one highlighted */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/50">Averages per game</h3>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {f.home.short} home</span>
              <span className="flex items-center gap-1 text-violet-300"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> {f.away.short} away</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <HomeAwayRow label="Goals" home={h?.goals ?? null} away={a?.goals ?? null} combined={f.goals_avg.toFixed(1)} unit="n" active={cat === 'goals'} />
            <HomeAwayRow label="Corners" home={h?.corners ?? null} away={a?.corners ?? null} combined={f.corners_avg.toFixed(1)} unit="n" active={cat === 'corners'} />
            <HomeAwayRow label="Cards" home={h?.cards ?? null} away={a?.cards ?? null} combined={f.cards_avg.toFixed(1)} unit="n" active={cat === 'cards'} />
            <HomeAwayRow label="BTTS" home={h?.btts ?? null} away={a?.btts ?? null} combined={`${f.btts_pct}%`} unit="%" active={cat === 'btts'} />
          </div>
          {(h || a) && (
            <p className="mt-1.5 text-[10px] text-white/35">Team averages from each side's last {Math.max(h?.n ?? 0, a?.n ?? 0)} games.</p>
          )}
        </section>

        {/* Market breakdown — over + under, form % + odds + value per mark */}
        {C.overMarks && (
          <section>
            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-white/50">{C.label} — odds & value</h3>
            <div className="space-y-1.5">
              {[
                ...C.overMarks.map((ln) => ({ ln, kind: 'Over' as const, pct: C.overPctAt(f, ln), o: C.overOdds(f, ln) })),
                ...(C.underMarks ?? []).map((ln) => {
                  const ov = C.overPctAt(f, ln);
                  return { ln, kind: 'Under' as const, pct: ov == null ? null : Math.round((100 - ov) * 10) / 10, o: C.underOdds(f, ln) };
                }),
              ].map(({ ln, kind, pct, o }) => {
                const cell = computeValue(pct, o);
                return (
                  <div key={`${kind}-${ln}`} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm">
                    <span className="w-20 font-bold text-white">{kind} {ln}</span>
                    <span className="w-14 text-emerald-400">{pct != null ? `${pct}%` : '—'}</span>
                    <span className="w-14 font-bold text-gold">{odd(o)}</span>
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
