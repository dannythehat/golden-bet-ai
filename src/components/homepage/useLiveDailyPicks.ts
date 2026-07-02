import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type DailyBet, type Leg, STAKE } from '@/lib/gafferSelection';

// ─── Live daily-picks reader — today's published gaffer_picks row ───────────
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
export type LiveDailyPicks = { title: string; gafferIntro: string; bet: DailyBet; updatedAt: string | null };

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
  const market = raw.market ?? raw.bet_type ?? raw.label ?? 'Pick';
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

export function useLiveDailyPicks() {
  return useQuery({
    queryKey: ['homepage_daily_picks_showcase'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<LiveDailyPicks | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('gaffer_picks')
        .select('id, pick_date, title, status, stake, bet_type, combined_odds, potential_returns, reasoning, gaffer_intro, legs, updated_at')
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
        updatedAt: raw.updated_at ?? null,
      };
    },
  });
}
