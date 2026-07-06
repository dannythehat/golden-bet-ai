import { useMemo, useState } from 'react';
import { X, ArrowDownWideNarrow, BellPlus, Swords, TrendingUp, Activity } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import {
  FAMILIES, VALUE_MARKETS, type HubSummary, type MarketSummary,
  type ValueMarketFamily, type ValueMarketKey, type Confidence, type FixtureStatus,
} from '@/lib/valueBoard';
import { useValueMarketFixtures, useFixtureValueBreakdown, useValueBoardLeagues } from '@/hooks/useValueBoard';

const confTone = (c: Confidence) =>
  c === 'high' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25'
  : c === 'medium' ? 'bg-amber-500/10 text-amber-300 ring-amber-400/25'
  : 'bg-white/[0.06] text-white/55 ring-white/15';

const statusTone: Record<FixtureStatus, string> = {
  scheduled: 'text-white/50', live: 'text-emerald-300', finished: 'text-white/40', stale: 'text-rose-300',
};

/* ── Market family tabs ─────────────────────────────────────────────────── */
function MarketFamilyTabs({ family, counts, onChange }: {
  family: ValueMarketFamily;
  counts: Record<ValueMarketFamily, number>;
  onChange: (f: ValueMarketFamily) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FAMILIES.map((f) => (
        <button
          key={f.family}
          onClick={() => onChange(f.family)}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black uppercase tracking-wide transition-colors ${family === f.family
            ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-[#16051f] shadow-[0_10px_26px_-12px_rgba(245,197,66,0.9)]'
            : 'border border-white/12 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]'}`}
        >
          {f.label}
          <span className={`rounded-full px-1.5 py-px text-[10px] [font-variant-numeric:tabular-nums] ${family === f.family ? 'bg-black/20' : 'bg-white/10'}`}>{counts[f.family]}</span>
        </button>
      ))}
    </div>
  );
}

/* ── One exact-market card ──────────────────────────────────────────────── */
function ValueMarketCard({ s, active, onOpen }: { s: MarketSummary; active: boolean; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className={`group relative overflow-hidden rounded-[14px] text-left transition-transform hover:-translate-y-0.5 ${active ? '' : ''}`}
    >
      <div className={`relative overflow-hidden rounded-[14px] border bg-gradient-to-b from-[#1c1338] to-[#110a26] ${active ? 'border-[#f5c542]/60' : s.status === 'value' ? 'border-emerald-400/30' : 'border-white/[0.09]'}`}>
        <div aria-hidden className={`h-[3px] ${s.status === 'value' ? 'bg-[linear-gradient(90deg,#065f46,#34d399,#065f46)]' : 'bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)] opacity-50'}`} />
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="font-display text-[15px] uppercase leading-tight tracking-tight text-white">{s.label}</span>
            {s.status === 'value'
              ? <span className="shrink-0 rounded-[6px] bg-emerald-500/15 px-1.5 py-[3px] text-[9px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [font-variant-numeric:tabular-nums]">{s.fixturesFoundToday} value</span>
              : <span className="shrink-0 rounded-[6px] bg-white/[0.06] px-1.5 py-[3px] text-[9px] font-black uppercase tracking-wide text-white/45 ring-1 ring-inset ring-white/10">{s.status === 'priced' ? 'no edge' : 'unpriced'}</span>}
          </div>
          {s.status === 'value' ? (
            <div className="mt-2 space-y-1 text-[11px] text-white/55">
              <div className="truncate">Strongest: <b className="text-white/85">{s.strongestFixture}</b></div>
              <div className="flex flex-wrap gap-x-3 [font-variant-numeric:tabular-nums]">
                <span>biggest gap <b className="text-emerald-300">+{s.biggestValueGap?.toFixed(1)}</b></span>
                <span>avg score <b className="text-white/85">{s.averageValueScore?.toFixed(1)}</b></span>
                {s.confidenceRange && <span>conf <b className="text-white/85">{s.confidenceRange}</b></span>}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-[11px] leading-snug text-white/40">
              {s.status === 'priced'
                ? 'No strong edge found for this market today.'
                : 'No bookmaker prices for this market in today’s leagues.'}
            </p>
          )}
          <div className={`mt-2.5 text-[10px] font-black uppercase tracking-[0.14em] ${active ? 'text-[#f8e7a1]' : 'text-white/35 group-hover:text-white/60'}`}>
            {active ? '▾ Showing fixtures below' : s.fixturesPriced > 0 ? `View ${s.fixturesPriced} priced fixture${s.fixturesPriced === 1 ? '' : 's'} →` : 'View →'}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Ranked fixtures for the selected market ────────────────────────────── */
function MarketFixtureTable({ marketKey, onRowClick }: { marketKey: ValueMarketKey; onRowClick: (fixtureId: string) => void }) {
  const [league, setLeague] = useState('all');
  const [minConf, setMinConf] = useState<Confidence | 'any'>('any');
  const [sort, setSort] = useState<'valueGap' | 'confidence' | 'kickoff'>('valueGap');
  const leagues = useValueBoardLeagues();
  const res = useValueMarketFixtures({ marketKey, league, minConfidence: minConf === 'any' ? undefined : minConf });
  if (!res.ok) return null;
  const order: Confidence[] = ['low', 'medium', 'high'];
  const rows = [...res.data.fixtures].sort((a, b) =>
    sort === 'valueGap' ? b.valueGap - a.valueGap
    : sort === 'confidence' ? order.indexOf(b.confidence) - order.indexOf(a.confidence) || b.valueGap - a.valueGap
    : a.kickoff.localeCompare(b.kickoff));

  const sel = 'rounded-lg border border-white/12 bg-[#160b2e] px-2.5 py-1.5 text-[11px] font-bold text-white/75 outline-none focus:border-[#f5c542]/50';
  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-white/[0.09] bg-gradient-to-b from-[#170e2e] to-[#0f0821]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-3.5 py-2.5">
        <span className="font-display text-[14px] uppercase tracking-tight text-white">{res.data.marketLabel}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">ranked by {sort === 'valueGap' ? 'value gap' : sort}</span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <select value={league} onChange={(e) => setLeague(e.target.value)} className={sel} aria-label="Filter by league">
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={minConf} onChange={(e) => setMinConf(e.target.value as Confidence | 'any')} className={sel} aria-label="Minimum confidence">
            <option value="any">Any confidence</option>
            <option value="medium">Medium +</option>
            <option value="high">High only</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={sel} aria-label="Sort">
            <option value="valueGap">Sort: value gap</option>
            <option value="confidence">Sort: confidence</option>
            <option value="kickoff">Sort: kickoff</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-white/50">{res.data.emptyStateMessage}</div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {rows.map((r) => (
            <button key={r.id} onClick={() => onRowClick(r.id)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.03]">
              <div className="flex shrink-0 items-center -space-x-1">
                <TeamAvatar name={r.homeTeam} logoUrl={r.homeLogo} size={26} className="rounded-md bg-black/45 p-0.5 ring-1 ring-white/12" />
                <TeamAvatar name={r.awayTeam} logoUrl={r.awayLogo} size={26} className="rounded-md bg-black/45 p-0.5 ring-1 ring-white/12" />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[13px] font-semibold text-white">{r.fixture}</span>
                  {r.qualifies && <span className="shrink-0 rounded-[5px] bg-emerald-500/15 px-1 py-px text-[8.5px] font-black uppercase text-emerald-300 ring-1 ring-inset ring-emerald-400/30">value</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[10.5px] text-white/45 [font-variant-numeric:tabular-nums]">
                  <span className="truncate">{r.league}</span>
                  <span className={statusTone[r.status]}>{r.status === 'scheduled' ? `${r.kickoffLabel} KO` : r.status}</span>
                  <span>form <b className="text-white/75">{Math.round(r.formScore)}%</b></span>
                  <span>implied <b className="text-white/75">{Math.round(r.impliedProbability)}%</b></span>
                </div>
              </div>
              <div className="shrink-0 text-right [font-variant-numeric:tabular-nums]">
                <div className={`text-[13px] font-black ${r.valueGap >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{r.valueGap >= 0 ? '+' : ''}{r.valueGap.toFixed(1)}</div>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  {r.oddsSnapshot != null && <span className="font-display text-[13px] text-[#f5c542]">{r.oddsSnapshot.toFixed(2)}</span>}
                  <span className={`rounded-[5px] px-1 py-px text-[8.5px] font-black uppercase ring-1 ring-inset ${confTone(r.confidence)}`}>{r.confidence[0]}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Fixture breakdown panel (modal) ────────────────────────────────────── */
function FixtureBreakdownPanel({ fixtureId, marketKey, onClose, onAddAlert }: {
  fixtureId: string; marketKey: ValueMarketKey; onClose: () => void; onAddAlert: (k: ValueMarketKey) => void;
}) {
  const res = useFixtureValueBreakdown(fixtureId, marketKey);
  if (!res) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[1.4rem] border border-white/12 bg-[#130321] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] sm:rounded-[1.4rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
        {res.ok === false ? (
          <div className="p-6 text-sm text-white/60">{res.error.message}</div>
        ) : (() => {
          const b = res.data;
          const dots = (games: typeof b.recentForm.home) => games.slice(0, 5).map((g, i) => (
            <span key={i} className={`grid h-4 w-4 place-items-center rounded-[4px] text-[9px] font-black ${g.res === 'W' ? 'bg-emerald-500/30 text-emerald-200' : g.res === 'L' ? 'bg-rose-500/30 text-rose-200' : 'bg-white/12 text-white/55'}`}>{g.res}</span>
          ));
          return (
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]/70">{b.league} · {b.status === 'scheduled' ? `${b.kickoffLabel} KO` : b.status}</div>
                  <h3 className="mt-1 font-display text-xl uppercase leading-tight tracking-tight text-white">{b.fixture}</h3>
                  <div className="mt-1 font-display text-[14px] uppercase tracking-tight text-[#f8e7a1]">{b.market}</div>
                </div>
                <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 text-white/60 hover:bg-white/[0.06]" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* numbers strip */}
              <div className="mt-4 grid grid-cols-4 divide-x divide-white/[0.08] overflow-hidden rounded-[12px] border border-white/[0.1] bg-black/25 text-center [font-variant-numeric:tabular-nums]">
                {[
                  { l: 'Model', v: `${Math.round(b.modelProbability)}%` },
                  { l: 'Implied', v: `${Math.round(b.impliedProbability)}%` },
                  { l: 'Gap', v: `${b.valueGap >= 0 ? '+' : ''}${b.valueGap.toFixed(1)}`, tone: b.valueGap >= 0 ? 'text-emerald-300' : 'text-rose-300' },
                  { l: 'Odds', v: b.oddsSnapshot?.toFixed(2) ?? '—', tone: 'text-[#f5c542]' },
                ].map((c) => (
                  <div key={c.l} className="px-1 py-2.5">
                    <div className="text-[8.5px] font-black uppercase tracking-[0.14em] text-white/40">{c.l}</div>
                    <div className={`mt-0.5 font-display text-[18px] leading-none ${c.tone ?? 'text-white'}`}>{c.v}</div>
                  </div>
                ))}
              </div>

              {/* market stats */}
              <div className="mt-3 rounded-[12px] border border-white/[0.1] bg-black/20 p-3.5 text-[12px] text-white/65">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 [font-variant-numeric:tabular-nums]">
                  {b.marketStats.hitRate && (
                    <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> Landed <b className="text-emerald-300">{b.marketStats.hitRate.hits}/{b.marketStats.hitRate.total}</b> recent</span>
                  )}
                  <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-violet-300" /> {b.marketStats.averages.label}: home <b className="text-white/90">{b.marketStats.averages.home ?? '—'}</b> · away <b className="text-white/90">{b.marketStats.averages.away ?? '—'}</b></span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-1.5"><span className="w-10 shrink-0 text-[9px] font-black uppercase tracking-wide text-white/40">Home</span><span className="flex gap-0.5">{dots(b.recentForm.home)}</span></div>
                  <div className="flex items-center justify-end gap-1.5"><span className="flex gap-0.5">{dots(b.recentForm.away)}</span><span className="w-10 shrink-0 text-right text-[9px] font-black uppercase tracking-wide text-white/40">Away</span></div>
                </div>
              </div>

              {/* head to head */}
              {b.headToHead.length > 0 && (
                <div className="mt-3 rounded-[12px] border border-white/[0.1] bg-black/20 p-3.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/45"><Swords className="h-3.5 w-3.5 text-violet-300" /> Head to head</div>
                  <div className="space-y-1 text-[11.5px] text-white/60 [font-variant-numeric:tabular-nums]">
                    {b.headToHead.slice(0, 4).map((h, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-white/35">{h.date}</span>
                        <span className="min-w-0 flex-1 truncate">{h.home} {h.hg}–{h.ag} {h.away}</span>
                        {h.corners != null && <span className="shrink-0 text-white/40">{h.corners} crn</span>}
                        {h.cards != null && <span className="shrink-0 text-white/40">{h.cards} crd</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* the Gaffer's read */}
              <div className="relative mt-3 overflow-hidden rounded-[12px] border border-white/[0.1] bg-gradient-to-b from-[#171029] to-[#0f0a1e]">
                <div aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-fuchsia-400 via-violet-500 to-violet-700" />
                <p className="py-3 pl-4 pr-3.5 text-[13px] italic leading-relaxed text-white/80">
                  <span aria-hidden className="mr-1 font-display text-lg leading-none text-violet-300/70">“</span>
                  {b.gafferVerdict}
                  <span aria-hidden className="ml-0.5 font-display text-lg leading-none text-violet-300/70">”</span>
                </p>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-white/40">{b.riskNote}</p>

              <button
                onClick={() => onAddAlert(marketKey)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-[12px] font-black uppercase tracking-wide text-white shadow-[0_14px_34px_-14px_rgba(139,92,246,1)] transition-transform hover:-translate-y-0.5"
              >
                <BellPlus className="h-4 w-4" /> Add this market to email alerts
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ── The board: tabs → cards → table → breakdown ────────────────────────── */
export function MarketBoard({ summary, onAddAlert }: { summary: HubSummary; onAddAlert: (k: ValueMarketKey) => void }) {
  const [family, setFamily] = useState<ValueMarketFamily>('goals');
  const [marketKey, setMarketKey] = useState<ValueMarketKey | null>(null);
  const [breakdown, setBreakdown] = useState<{ fixtureId: string; marketKey: ValueMarketKey } | null>(null);

  const familyMarkets = useMemo(
    () => summary.allMarkets.filter((s) => s.family === family),
    [summary, family],
  );
  const activeKey = marketKey && VALUE_MARKETS.find((m) => m.key === marketKey)?.family === family
    ? marketKey
    : familyMarkets.find((s) => s.status === 'value')?.marketKey ?? familyMarkets.find((s) => s.status === 'priced')?.marketKey ?? null;

  return (
    <section id="market-board" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#130321]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-200">
              <ArrowDownWideNarrow className="h-3.5 w-3.5" /> Today's Markets
            </span>
            <h2 className="mt-2.5 font-display text-2xl uppercase tracking-tight text-white md:text-3xl">Browse the value, market by market</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55">
              Some members love goals. Some love corners. Some are card merchants. Fine — I've sorted the lot.
              Pick a family, pick your exact line, and see every priced fixture ranked by the gap.
            </p>
          </div>
          <div className="text-right text-[11px] text-white/45 [font-variant-numeric:tabular-nums]">
            <div><b className="text-white/85">{summary.totalFixturesScanned}</b> fixtures scanned</div>
            <div><b className="text-white/85">{summary.totalMarketsScanned}</b> markets · <b className="text-emerald-300">{summary.totalValueFixtures}</b> value edges</div>
          </div>
        </div>

        <div className="mt-4"><MarketFamilyTabs family={family} counts={summary.marketFamilyCounts} onChange={(f) => { setFamily(f); setMarketKey(null); }} /></div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {familyMarkets.map((s) => (
            <ValueMarketCard key={s.marketKey} s={s} active={s.marketKey === activeKey} onOpen={() => setMarketKey(s.marketKey)} />
          ))}
        </div>

        {activeKey && <MarketFixtureTable marketKey={activeKey} onRowClick={(fixtureId) => setBreakdown({ fixtureId, marketKey: activeKey })} />}
      </div>

      {breakdown && (
        <FixtureBreakdownPanel
          fixtureId={breakdown.fixtureId}
          marketKey={breakdown.marketKey}
          onClose={() => setBreakdown(null)}
          onAddAlert={(k) => { setBreakdown(null); onAddAlert(k); }}
        />
      )}
    </section>
  );
}
