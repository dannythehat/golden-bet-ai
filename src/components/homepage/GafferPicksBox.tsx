import { Flame, Target, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamAvatar } from '@/components/TeamAvatar';
import { getDailyBet, getGafferPicks, type DailyBet, type Leg, STAKE } from '@/lib/gafferSelection';

// ─── Live data plumbing (kept, but header UI is compact) ────────────────────
type RawPickLeg = {
  fixtureId?: string; fixture_id?: string; fixture?: string; match?: string; game?: string;
  home_team?: string; away_team?: string; homeTeam?: string; awayTeam?: string;
  home_logo?: string | null; away_logo?: string | null; homeLogo?: string | null; awayLogo?: string | null;
  league?: string; region?: string; kickoff_time?: string; time?: string;
  market?: string; bet_type?: string; selection?: string; label?: string;
  odds?: number | string; price?: number | string; best_price?: number | string;
  confidence?: number; probability?: number; formProb?: number; edge?: number;
  reason?: string; short_reason?: string; gaffer_line?: string;
};
type RawDailyPick = {
  id: string; pick_date?: string | null; title?: string | null; status?: string | null;
  stake?: number | null; bet_type?: string | null;
  combined_odds?: number | string | null; potential_returns?: number | string | null;
  reasoning?: string | null; gaffer_intro?: string | null;
  updated_at?: string | null; created_at?: string | null; legs?: RawPickLeg[] | null;
};
type LiveDailyPicks = { title: string; gafferIntro: string; bet: DailyBet };

const parseTeams = (f?: string | null) => {
  if (!f) return { home: 'Home', away: 'Away' };
  const p = f.split(/\s+vs\s+|\s+v\s+|\s+-\s+/i);
  return p.length >= 2 ? { home: p[0].trim(), away: p[1].trim() } : { home: f, away: 'Away' };
};
const toNumber = (v: unknown, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
const normConf = (v: unknown, d = 72) => {
  const n = toNumber(v, d);
  return Math.max(1, Math.min(100, n <= 1 ? Math.round(n * 100) : Math.round(n)));
};
const formatKO = (raw?: string | null) => {
  if (!raw) return 'TBC';
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? raw : dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

function rawLegToLeg(raw: RawPickLeg, i: number): Leg {
  const parsed = parseTeams(raw.fixture ?? raw.match ?? raw.game ?? null);
  const home = raw.home_team ?? raw.homeTeam ?? parsed.home;
  const away = raw.away_team ?? raw.awayTeam ?? parsed.away;
  const market = raw.market ?? raw.bet_type ?? raw.label ?? "Pick";
  const selection = raw.selection ?? raw.label ?? raw.bet_type ?? market;
  const odds = toNumber(raw.best_price ?? raw.odds ?? raw.price, 1);
  const prob = normConf(raw.confidence ?? raw.probability ?? raw.formProb, 72);
  const edge = toNumber(raw.edge, Math.max(1, prob - Math.round(100 / Math.max(odds, 1))));
  return {
    fixtureId: raw.fixtureId ?? raw.fixture_id ?? `${home}-${away}-${i}`,
    home: { name: home, short: home.slice(0, 3).toUpperCase(), logo: raw.home_logo ?? raw.homeLogo ?? null },
    away: { name: away, short: away.slice(0, 3).toUpperCase(), logo: raw.away_logo ?? raw.awayLogo ?? null },
    region: raw.region ?? 'Today',
    league: raw.league ?? 'Featured fixture',
    time: formatKO(raw.kickoff_time ?? raw.time),
    market: market.toLowerCase().includes('corner') ? 'Corners' : market.toLowerCase().includes('btts') ? 'BTTS' : 'Goals',
    selection, odds, prob, edge,
    flag: edge >= 8 ? 'strong' : 'value',
    placeholderReason: raw.gaffer_line ?? raw.reason ?? raw.short_reason ??
      `Board likes ${selection.toLowerCase()} — ${prob}% confidence at ${odds.toFixed(2)}. Value, not vibes.`,
  };
}

function buildBet(legs: Leg[], raw: RawDailyPick): DailyBet {
  if (legs.length === 0) return { type: 'none', legs: [] };
  const stake = raw.stake ?? STAKE;
  if ((raw.bet_type ?? '').toLowerCase() !== 'single' && legs.length >= 2) {
    const picked: [Leg, Leg] = [legs[0], legs[1]];
    const co = toNumber(raw.combined_odds, Number((picked[0].odds * picked[1].odds).toFixed(2)));
    return { type: 'double', legs: picked, combinedOdds: co, stake, returns: toNumber(raw.potential_returns, Number((stake * co).toFixed(2))) };
  }
  const picked: [Leg] = [legs[0]];
  const co = toNumber(raw.combined_odds, picked[0].odds);
  return { type: 'single', legs: picked, combinedOdds: co, stake, returns: toNumber(raw.potential_returns, Number((stake * co).toFixed(2))) };
}

function useLiveDailyPicks() {
  return useQuery({
    queryKey: ['homepage_daily_picks_showcase'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<LiveDailyPicks | null> => {
      const { data, error } = await (supabase as any)
        .from('gaffer_picks')
        .select('id, pick_date, title, status, stake, bet_type, combined_odds, potential_returns, reasoning, gaffer_intro, legs')
        .in('status', ['published', 'live', 'active'])
        .order('pick_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      const raw = data as RawDailyPick;
      const legs = Array.isArray(raw.legs) ? raw.legs.map(rawLegToLeg).sort((a, b) => b.edge - a.edge) : [];
      return {
        title: raw.title ?? "Today's Gaffer Picks",
        gafferIntro: raw.gaffer_intro ?? raw.reasoning ?? "The Gaffer's pointing at the value — form beats price by a mile.",
        bet: buildBet(legs, raw),
      };
    },
  });
}

// ─── UI ─────────────────────────────────────────────────────────────────────
function PickCard({ leg, index }: { leg: Leg; index: number }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
      {/* meta row */}
      <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        <span className="truncate">{leg.region} · {leg.league} · {leg.time} KO</span>
        <span className="shrink-0 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 px-2 py-0.5 text-[#f8e7a1]">Pick {index + 1}</span>
      </div>

      {/* teams + odds */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex shrink-0 -space-x-1.5">
            <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={34} />
            <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={34} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold text-white">
              {leg.home.name} <span className="text-white/35">v</span> {leg.away.name}
            </div>
            <div className="mt-0.5 inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
              {leg.selection}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-xl leading-none text-[#f5c542]">{leg.odds.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/45">odds</div>
        </div>
      </div>

      {/* confidence + edge */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
          <div className="flex items-center justify-between text-white/45"><span>Confidence</span><span className="font-bold text-white">{leg.prob}%</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-[#f5c542]" style={{ width: `${leg.prob}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white/45">
          <span>Edge</span>
          <span className="font-display text-lg leading-none text-emerald-300">+{leg.edge.toFixed(1)}%</span>
        </div>
      </div>

      {/* gaffer line */}
      <p className="mt-3 text-[13px] italic leading-relaxed text-white/70">“{leg.placeholderReason}”</p>
    </article>
  );
}

export function GafferPicksBox() {
  const { data: live } = useLiveDailyPicks();
  const fallbackBet = getDailyBet(getGafferPicks());
  const bet = live?.bet ?? fallbackBet;
  const intro = live?.gafferIntro ?? "The Gaffer's pointing at the value — form beats price by a mile.";

  return (
    <section
      id="daily-picks"
      data-endpoint="gaffer_picks"
      data-lovable-hook="homepage_daily_picks_showcase"
      className="relative overflow-hidden rounded-[1.4rem] border border-[#f5c542]/35 bg-[#130321] shadow-[0_22px_70px_-30px_rgba(245,197,66,0.7)] md:rounded-[1.9rem]"
    >
      {/* gold accent bar (matches TodaysDouble / PnLSection) */}
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      <div className="relative p-5 md:p-8">
        {/* Header */}
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
            <Flame className="h-3.5 w-3.5" /> The Gaffer's Picks
          </span>
          <h2 className="mt-2 font-display text-2xl uppercase leading-[1.05] tracking-tight text-white sm:text-3xl md:text-4xl">
            Today's Value Board
          </h2>
          <p className="mt-2 text-sm text-white/55">{intro}</p>
        </div>

        {/* Picks */}
        {bet.type === 'none' ? (
          <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10">
              <Target className="h-5 w-5 text-[#f5c542]" />
            </div>
            <h3 className="font-display text-xl text-white">No bet today.</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-white/55">No value worth backing. Powder stays dry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bet.legs.map((leg, i) => <PickCard key={leg.fixtureId} leg={leg} index={i} />)}

            {/* Slip */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/[0.07] p-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/35 bg-black/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f8e7a1]">
                  <Trophy className="h-3 w-3" /> The Gaffer's Slip
                </div>
                <div className="mt-1.5 font-display text-2xl uppercase tracking-wide text-[#f5c542] sm:text-3xl">
                  £{bet.stake} {bet.type === 'double' ? 'Double' : 'Single'}
                </div>
                <div className="text-xs text-white/55">combined odds {bet.combinedOdds.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Returns</div>
                <div className="font-display text-2xl leading-none text-emerald-300 sm:text-3xl">£{bet.returns.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
