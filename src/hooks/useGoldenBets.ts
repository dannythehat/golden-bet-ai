import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GoldenBet } from '@/types/betting';
import { getEffectiveBetDate, isBeforeRefresh } from '@/lib/betDate';
import { todaysGoldenBets } from '@/data/mockData';
import { normalizeMarketKey } from '@/lib/marketDisplay';

interface GoldenBetsResponse {
  success: boolean;
  bets: Array<{
    id: string;
    fixtureId?: number;
    homeTeam: string;
    awayTeam: string;
    league: string;
    kickoff: string;
    market: 'over_2.5_goals' | 'btts' | 'over_9.5_corners' | 'over_3.5_cards';
    mlConfidence: number;
    gafferReasoning: string;
    valueEdge: number;
    bookmakerOdds: number;
    bookmaker?: {
      key: string;
      title: string;
      logo?: string;
      lastUpdate?: string;
    };
  }>;
  fixturesAnalyzed: number;
  timestamp: string;
}

interface DBBet {
  id: string;
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  market: string;
  ml_confidence: number;
  value_edge: number;
  gaffer_reasoning: string;
  bookmaker_odds: number;
  stake: number;
  status: string;
  result: string | null;
  profit_loss: number | null;
  prediction_date: string;
}

function pickBestMarketKey(liveBet: any, db?: DBBet): string {
  const candidate =
    liveBet?.market ??
    liveBet?.market_key ??
    liveBet?.marketKey ??
    liveBet?.pick_market ??
    liveBet?.pickMarket ??
    liveBet?.bet_market ??
    liveBet?.betMarket ??
    liveBet?.type ??
    db?.market;

  const normalized = normalizeMarketKey(candidate);
  return normalized || normalizeMarketKey(db?.market) || 'unknown_market';
}

/** Keep only the highest-confidence pick per fixture_id */
function deduplicateByFixture(bets: GoldenBet[]): GoldenBet[] {
  const map = new Map<string, GoldenBet>();
  for (const bet of bets) {
    const key = bet.fixtureId ? String(bet.fixtureId) : `${bet.homeTeam}|${bet.awayTeam}`;
    const existing = map.get(key);
    if (!existing || bet.mlConfidence > existing.mlConfidence) {
      map.set(key, bet);
    }
  }
  return Array.from(map.values());
}

/** Select the Gold pick (highest confidence) from each market category */
function selectGoldPerMarket(bets: GoldenBet[]): GoldenBet[] {
  const marketBuckets: Record<string, GoldenBet[]> = {
    goals: [],
    corners: [],
    cards: [],
  };

  for (const bet of bets) {
    const m = normalizeMarketKey(bet.market);
    if (m.includes('goal') || m.includes('btts')) marketBuckets.goals.push(bet);
    else if (m.includes('corner')) marketBuckets.corners.push(bet);
    else if (m.includes('card')) marketBuckets.cards.push(bet);
    else marketBuckets.goals.push(bet); // fallback
  }

  const result: GoldenBet[] = [];
  for (const key of ['goals', 'corners', 'cards'] as const) {
    const sorted = marketBuckets[key].sort((a, b) => b.mlConfidence - a.mlConfidence);
    if (sorted.length > 0) result.push(sorted[0]);
  }
  return result;
}

async function fetchGoldenBets(): Promise<{ bets: GoldenBet[]; isLive: boolean; message?: string; showingYesterday?: boolean }> {
  // Always load today's DB rows (for status/result/P&L), then prefer live backend response for odds + bookmaker.
  const today = getEffectiveBetDate();
  const showingYesterday = isBeforeRefresh();
  
  const { data: dbBets, error: dbError } = await supabase
    .from('golden_bet_history')
    .select('*')
    .eq('prediction_date', today)
    .order('ml_confidence', { ascending: false });

  const dbMap = new Map<string, DBBet>();
  const dbCompositeMap = new Map<string, DBBet>();

  const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
  const normKickoff = (k: unknown) => {
    const t = Date.parse(String(k ?? ''));
    return Number.isFinite(t) ? new Date(t).toISOString() : String(k ?? '');
  };

  (dbBets as DBBet[] | null | undefined)?.forEach((b) => {
    if (b?.fixture_id) dbMap.set(String(b.fixture_id), b);
    if (b?.home_team && b?.away_team && b?.kickoff) {
      dbCompositeMap.set(`${norm(b.home_team)}|${norm(b.away_team)}|${normKickoff(b.kickoff)}`, b);
    }
  });

  // If showing yesterday's picks, skip calling the edge function (don't trigger new generation)
  if (showingYesterday) {
    if (!dbError && dbBets && dbBets.length > 0) {
      const bets: GoldenBet[] = selectGoldPerMarket(deduplicateByFixture((dbBets as DBBet[]).map((bet) => ({
        id: bet.id,
        fixtureId: parseInt(bet.fixture_id) || undefined,
        homeTeam: bet.home_team,
        awayTeam: bet.away_team,
        league: bet.league,
        kickoff: bet.kickoff,
        market: bet.market as GoldenBet['market'],
        mlConfidence: bet.ml_confidence,
        bookmakerOdds: bet.bookmaker_odds,
        impliedProbability: 1 / bet.bookmaker_odds,
        valueEdge: bet.value_edge,
        gafferReasoning: bet.gaffer_reasoning,
        status: bet.status as GoldenBet['status'],
        stake: bet.stake || 10,
        result: bet.result || undefined,
        profitLoss: bet.profit_loss || undefined,
      })))); 
      return { bets, isLive: true, showingYesterday: true };
    }
    return { bets: [], isLive: false, message: "Today's picks will be ready at 6 AM UTC", showingYesterday: true };
  }

  // Pull live odds + bookmaker from backend function (this is what updates as markets move)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const { data, error } = await supabase.functions.invoke('golden-bets', {
      method: 'POST',
      body: undefined,
    }).finally(() => clearTimeout(timeout));

    const live = data as GoldenBetsResponse | (GoldenBetsResponse & { error?: string }) | undefined;

    // If backend responded cleanly but says "no picks" or "invalid feed", surface the message
    if (!error && live && live.success === false) {
      return {
        bets: [],
        isLive: false,
        message: (live as any).message || (live as any).error || 'ML predictions unavailable today',
      };
    }

    if (!error && live?.success && Array.isArray(live.bets) && live.bets.length > 0) {
      const liveBets: GoldenBet[] = live.bets.map((bet: any) => {
        const mlConfidence = bet.mlConfidence ?? bet.ml_confidence;
        const valueEdge = bet.valueEdge ?? bet.value_edge;

        const bookmakerOdds =
          bet.bookmakerOdds ??
          bet.bookmaker_odds ??
          calculateOddsFromConfidence(mlConfidence, valueEdge);

        const fixtureId = bet.fixtureId ?? (bet.fixture_id ? parseInt(bet.fixture_id) : undefined);
        const fixtureKey = fixtureId ? String(fixtureId) : undefined;
          const dbByFixture = fixtureKey ? dbMap.get(fixtureKey) : undefined;
          const dbByComposite = (!dbByFixture && bet?.homeTeam && bet?.awayTeam && bet?.kickoff)
            ? dbCompositeMap.get(`${norm(bet.homeTeam ?? bet.home_team)}|${norm(bet.awayTeam ?? bet.away_team)}|${normKickoff(bet.kickoff)}`)
            : undefined;
          const db = dbByFixture ?? dbByComposite;

          const marketKey = pickBestMarketKey(bet, db);

        return {
          id: bet.id,
          fixtureId,
          homeTeam: bet.homeTeam ?? bet.home_team,
          awayTeam: bet.awayTeam ?? bet.away_team,
          league: bet.league,
          kickoff: bet.kickoff,
            market: marketKey as any,
          mlConfidence,
          bookmakerOdds: db?.bookmaker_odds ?? bookmakerOdds,
          impliedProbability: 1 / (db?.bookmaker_odds ?? bookmakerOdds),
          valueEdge,
          gafferReasoning: bet.gafferReasoning ?? bet.gaffer_reasoning ?? (bet as any).reasoning ?? '',
          bookmaker: bet.bookmaker,
          // If a bet has already been settled, prefer DB truth
          status: (db?.status as GoldenBet['status']) ?? ('pending' as const),
          stake: db?.stake ?? 10,
          result: db?.result || undefined,
          profitLoss: db?.profit_loss || undefined,
        };
      });

      return { bets: selectGoldPerMarket(deduplicateByFixture(liveBets)), isLive: true };
    }
  } catch (error) {
    console.error('Error invoking golden-bets:', error);
  }
  
  // If backend call fails, fall back to DB (still shows settled status/P&L)
  if (!dbError && dbBets && dbBets.length > 0) {
    const bets: GoldenBet[] = selectGoldPerMarket(deduplicateByFixture((dbBets as DBBet[]).map((bet) => ({
      id: bet.id,
      fixtureId: parseInt(bet.fixture_id) || undefined,
      homeTeam: bet.home_team,
      awayTeam: bet.away_team,
      league: bet.league,
      kickoff: bet.kickoff,
      market: bet.market as GoldenBet['market'],
      mlConfidence: bet.ml_confidence,
      bookmakerOdds: bet.bookmaker_odds,
      impliedProbability: 1 / bet.bookmaker_odds,
      valueEdge: bet.value_edge,
      gafferReasoning: bet.gaffer_reasoning,
      status: bet.status as GoldenBet['status'],
      stake: bet.stake || 10,
      result: bet.result || undefined,
      profitLoss: bet.profit_loss || undefined,
    })))); 
    return { bets, isLive: true };
  }

  return {
    bets: [],
    isLive: false,
    message: 'ML predictions unavailable today',
  };
}

function calculateOddsFromConfidence(confidence: number, valueEdge: number): number {
  if (!confidence || confidence <= 0) return 0;
  const impliedOdds = 1 / confidence;
  return Math.round((impliedOdds + (impliedOdds * valueEdge)) * 100) / 100;
}

function transformFallback(): GoldenBet[] {
  const today = new Date();
  return todaysGoldenBets.map((bet, index) => ({
    ...bet,
    kickoff: new Date(today.getTime() + (index + 1) * 3600000).toISOString(),
    gafferReasoning: "The Gaffer's taking a tea break, but trust the numbers on this one!",
  }));
}

export function useGoldenBets() {
  const effectiveDate = getEffectiveBetDate();
  const query = useQuery({
    queryKey: ['golden-bets', effectiveDate],
    queryFn: fetchGoldenBets,
    // Results can change after matches finish (settlement), so keep this fairly fresh.
    staleTime: 1000 * 60 * 2, // 2 min — reduce hammering slow edge functions
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  return {
    bets: query.data?.bets ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFromAPI: query.data?.isLive ?? false,
    statusMessage: query.data?.message,
  };
}
