import { useMemo, useState } from 'react';
import { X, BellPlus, Swords, TrendingUp, Activity, Search } from 'lucide-react';
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

// 'Over 2.5 Goals' → 'O 2.5' for tight chips.
const shortLabel = (s: MarketSummary): string =>
  s.family === 'btts' ? s.label.replace('Both Teams To Score — ', 'BTTS ') : s.label.replace(/^Over /, 'O ').replace(/^Under /, 'U ').replace(/ (Goals|Corners|Cards)$/, '');

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
          {counts[f.family] > 0 && (
            <span className={`rounded-full px-1.5 py-px text-[10px] [font-variant-numeric:tabular-nums] ${family === f.family ? 'bg-black/20' : 'bg-emerald-500/20 text-emerald-300'}`}>{counts[f.family]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── A market with value today — a proper card ──────────────────────────── */
function ValueMarketCard({ s, active, onOpen }: { s: MarketSummary; active: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group text-left transition-transform hover:-translate-y-0.5">
      <div
        className="relative rounded-[14px] p-px shadow-[0_2px_4px_-1px_rgba(0,0,0,0.7),0_18px_36px_-18px_rgba(0,0,0,0.95)]"
        style={{ background: active
          ? 'linear-gradient(160deg,#f5c542 0%,#8b5cf6 48%,#22d3ee 100%)'
          : 'linear-gradient(160deg,#6ee7b7 0%,#065f46 55%,#34d399 100%)' }}
      >
        <div className="relative overflow-hidden rounded-[13px] bg-gradient-to-b from-[#1c1338] to-[#110a26] p-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="font-display text-[16px] uppercase leading-tight tracking-tight text-white">{s.label}</span>
            <span className="shrink-0 rounded-[6px] bg-emerald-500/15 px-1.5 py-[3px] text-[10px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [font-variant-numeric:tabular-nums]">
              +{s.biggestValueGap?.toFixed(1)}% edge
            </span>
          </div>
          <div className="mt-1.5 truncate text-[12px] font-semibold text-white/80">{s.strongestFixture}</div>
          <div className="mt-1 text-[10.5px] text-white/45 [font-variant-numeric:tabular-nums]">
            {s.fixturesFoundToday} value pick{s.fixturesFoundToday === 1 ? '' : 's'} today · {s.confidenceRange} confidence
          </div>
          <div className={`mt-2 text-[10px] font-black uppercase tracking-[0.14em] ${active ? 'text-[#f8e7a1]' : 'text-emerald-300/80 group-hover:text-emerald-200'}`}>
            {active ? '▾ Fixtures below' : 'See the fixtures →'}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Ranked fixtures for the selected market ────────────────────────────── */
function MarketFixtureTable({ marketKey, onRowClick }: { marketKey: ValueMarketKey; onRowClick: (fixtureId: string) => void }) {
  const [league, setLeague] = useState('all');
  const leagues = useValueBoardLeagues();
  const res = useValueMarketFixtures({ marketKey, league });
  if (!res.ok) return null;
  const rows = res.data.fixtures;

  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-white/[0.1] bg-gradient-to-b from-[#170e2e] to-[#0f0821]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.1] px-3.5 py-2.5">
        <span className="font-display text-[15px] uppercase tracking-tight text-white">{res.data.marketLabel}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">best edge first</span>
        {leagues.length > 1 && (
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="ml-auto rounded-lg border border-white/12 bg-[#160b2e] px-2.5 py-1.5 text-[11px] font-bold text-white/75 outline-none focus:border-[#f5c542]/50"
            aria-label="Filter by league"
          >
            <option value="all">All leagues</option>
            {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-white/50">{res.data.emptyStateMessage}</div>
      ) : (
        <div className="divide-y divide-white/[0.07]">
          {rows.map((r) => (
            <button key={r.id} onClick={() => onRowClick(r.id)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]">
              <div className="flex shrink-0 items-center -space-x-1.5">
                <TeamAvatar name={r.homeTeam} logoUrl={r.homeLogo} size={32} className="rounded-lg bg-black/45 p-0.5 ring-1 ring-white/12" />
                <TeamAvatar name={r.awayTeam} logoUrl={r.awayLogo} size={32} className="rounded-lg bg-black/45 p-0.5 ring-1 ring-white/12" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-white">{r.fixture}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-white/45 [font-variant-numeric:tabular-nums]">
                  <span className="truncate">{r.league}</span>
                  <span className={statusTone[r.status]}>{r.status === 'scheduled' ? `${r.kickoffLabel} KO` : r.status.toUpperCase()}</span>
                  <span>Form <b className="text-white/80">{Math.round(r.formScore)}%</b> · price says <b className="text-white/80">{Math.round(r.impliedProbability)}%</b></span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {r.oddsSnapshot != null && <div className="font-display text-[19px] leading-none text-[#f5c542] [font-variant-numeric:tabular-nums] drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]">{r.oddsSnapshot.toFixed(2)}</div>}
                {r.qualifies
                  ? <div className="mt-1 inline-flex items-center rounded-[6px] bg-emerald-500/15 px-1.5 py-[3px] text-[9.5px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [font-variant-numeric:tabular-nums]">+{r.valueGap.toFixed(1)}% edge</div>
                  : <div className="mt-1 text-[10px] font-bold text-white/35 [font-variant-numeric:tabular-nums]">{r.valueGap >= 0 ? '+' : ''}{r.valueGap.toFixed(1)}% · no edge</div>}
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
                  <div className="mt-2 flex items-center gap-2.5">
                    <TeamAvatar name={b.homeTeam} logoUrl={b.homeLogo} size={40} className="shrink-0 rounded-[10px] bg-black/45 p-1 ring-1 ring-white/12" />
                    <span className="font-display text-[13px] uppercase text-white/30">vs</span>
                    <TeamAvatar name={b.awayTeam} logoUrl={b.awayLogo} size={40} className="shrink-0 rounded-[10px] bg-black/45 p-1 ring-1 ring-white/12" />
                  </div>
                  <h3 className="mt-2 font-display text-xl uppercase leading-tight tracking-tight text-white">{b.fixture}</h3>
                  <div className="mt-0.5 font-display text-[14px] uppercase tracking-tight text-[#f8e7a1]">{b.market}</div>
                </div>
                <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 text-white/60 hover:bg-white/[0.06]" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* the honest numbers, in plain English */}
              <div className="mt-4 grid grid-cols-4 divide-x divide-white/[0.1] overflow-hidden rounded-[12px] border border-white/[0.12] bg-black/25 text-center [font-variant-numeric:tabular-nums]">
                {[
                  { l: 'Form says', v: `${Math.round(b.modelProbability)}%` },
                  { l: 'Price says', v: `${Math.round(b.impliedProbability)}%` },
                  { l: 'Edge', v: `${b.valueGap >= 0 ? '+' : ''}${b.valueGap.toFixed(1)}%`, tone: b.valueGap >= 0 ? 'text-emerald-300' : 'text-rose-300' },
                  { l: 'Odds', v: b.oddsSnapshot?.toFixed(2) ?? '—', tone: 'text-[#f5c542]' },
                ].map((c) => (
                  <div key={c.l} className="px-1 py-2.5">
                    <div className="text-[8.5px] font-black uppercase tracking-[0.12em] text-white/40">{c.l}</div>
                    <div className={`mt-0.5 font-display text-[18px] leading-none ${c.tone ?? 'text-white'}`}>{c.v}</div>
                  </div>
                ))}
              </div>

              {/* market stats */}
              <div className="mt-3 rounded-[12px] border border-white/[0.1] bg-black/20 p-3.5 text-[12px] text-white/65">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 [font-variant-numeric:tabular-nums]">
                  {b.marketStats.hitRate && (
                    <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-300" /> Landed <b className="text-emerald-300">{b.marketStats.hitRate.hits}/{b.marketStats.hitRate.total}</b> recent games</span>
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
                <div className="flex items-center gap-2 border-b border-white/[0.08] py-2 pl-4 pr-3.5">
                  <img src="/images/the-gaffer.png" alt="" loading="lazy" className="h-7 w-7 rounded-full object-cover object-top ring-1 ring-violet-400/50" />
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">The Gaffer's read</span>
                </div>
                <p className="py-2.5 pl-4 pr-3.5 text-[13px] italic leading-relaxed text-white/80">{b.gafferVerdict}</p>
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

/* ── The board: tabs → value cards → quiet chips → table → breakdown ────── */
export function MarketBoard({ summary, onAddAlert }: { summary: HubSummary; onAddAlert: (k: ValueMarketKey) => void }) {
  const [family, setFamily] = useState<ValueMarketFamily>('goals');
  const [marketKey, setMarketKey] = useState<ValueMarketKey | null>(null);
  const [breakdown, setBreakdown] = useState<{ fixtureId: string; marketKey: ValueMarketKey } | null>(null);

  const familyMarkets = useMemo(() => summary.allMarkets.filter((s) => s.family === family), [summary, family]);
  const valueMarkets = familyMarkets.filter((s) => s.status === 'value');
  const quietMarkets = familyMarkets.filter((s) => s.status === 'priced');
  const unpricedMarkets = familyMarkets.filter((s) => s.status === 'unpriced');

  const activeKey = marketKey && VALUE_MARKETS.find((m) => m.key === marketKey)?.family === family
    ? marketKey
    : valueMarkets[0]?.marketKey ?? quietMarkets[0]?.marketKey ?? null;

  return (
    <section id="market-board" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#130321]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-200">
              <Search className="h-3.5 w-3.5" /> Today's Markets
            </span>
            <h2 className="mt-2.5 font-display text-2xl uppercase tracking-tight text-white md:text-3xl">Pick your market. I've done the digging.</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55">
              Goals fan? Corner merchant? Card counter? The scan covers the lot — anything with a real edge today gets a green card below.
            </p>
          </div>
        </div>

        <div className="mt-4"><MarketFamilyTabs family={family} counts={summary.marketFamilyCounts} onChange={(f) => { setFamily(f); setMarketKey(null); }} /></div>

        {/* markets WITH value — proper cards */}
        {valueMarkets.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {valueMarkets.map((s) => (
              <ValueMarketCard key={s.marketKey} s={s} active={s.marketKey === activeKey} onOpen={() => setMarketKey(s.marketKey)} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-6 text-center">
            <h3 className="font-display text-xl uppercase text-white">Nowt in {FAMILIES.find((f) => f.family === family)?.label} today.</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-white/55">The bookies have this family priced right for once — check another tab, or browse the raw numbers below.</p>
          </div>
        )}

        {/* quiet markets — one compact row, not a wall of grey boxes */}
        {quietMarkets.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2.5">
            <span className="mr-1 text-[9.5px] font-black uppercase tracking-[0.16em] text-white/35">No edge today</span>
            {quietMarkets.map((s) => (
              <button
                key={s.marketKey}
                onClick={() => setMarketKey(s.marketKey)}
                className={`rounded-md px-2 py-1 text-[10.5px] font-bold transition-colors [font-variant-numeric:tabular-nums] ${s.marketKey === activeKey ? 'bg-[#f5c542]/15 text-[#f8e7a1] ring-1 ring-inset ring-[#f5c542]/40' : 'bg-white/[0.05] text-white/55 ring-1 ring-inset ring-white/10 hover:bg-white/[0.1]'}`}
              >
                {shortLabel(s)}
              </button>
            ))}
          </div>
        )}
        {unpricedMarkets.length > 0 && (
          <p className="mt-2 px-1 text-[10.5px] text-white/35">
            No bookmaker prices in today's leagues for: {unpricedMarkets.map(shortLabel).join(', ')}.
          </p>
        )}

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
