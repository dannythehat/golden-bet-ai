import { useMemo, useState, useEffect } from 'react';
import { parseReasoning } from '@/lib/parseReasoning';
import { Link } from 'react-router-dom';
import { BetBuilder } from '@/hooks/useBetBuilder';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Layers, Target, CheckCircle2, XCircle, Clock, Zap, Bell, BellRing, Radio, Flag, Square, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeagueFlag } from '@/lib/countryFlags';
import theGafferImage from '@/assets/the-gaffer.webp';
import { BOOKMAKER_LOGOS } from '@/types/betting';
import { Bet365Badge } from '@/components/Bet365Badge';
import { AlertPreferencesDrawer } from '@/components/AlertPreferencesDrawer';
import { useAlertPreferences, CreateAlertPreference } from '@/hooks/useAlertPreferences';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';
import { usePersistentFixtureStats } from '@/hooks/usePersistentFixtureStats';
import { isFinishedStatus, isInPlayStatus } from '@/lib/fixtureStatus';
import { didMarketHit } from '@/lib/marketEval';
import { LiveMarketTracker, LiveScore, MatchStatusBadge } from '@/components/LiveMarketTracker';

const BookmakerLogo = ({ bookmaker }: { bookmaker?: { key: string; title: string; logo?: string } }) => {
  if (!bookmaker) return null;
  const logoUrl = bookmaker.logo || BOOKMAKER_LOGOS[bookmaker.key];
  if (!logoUrl) {
    return <span className="text-xs font-medium text-muted-foreground">{bookmaker.title}</span>;
  }
  return (
    <img
      src={logoUrl}
      alt={bookmaker.title}
      className="h-5 w-auto max-w-[90px] object-contain"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

const marketLabels: Record<string, string> = {
  over_25_goals: 'Over 2.5 Goals',
  over_2_5_goals: 'Over 2.5 Goals',
  under_25_goals: 'Under 2.5 Goals',
  under_2_5_goals: 'Under 2.5 Goals',
  btts: 'BTTS',
  no_btts: 'No BTTS',
  over_85_corners: 'Over 8.5 Corners',
  over_8_5_corners: 'Over 8.5 Corners',
  over_95_corners: 'Over 9.5 Corners',
  over_9_5_corners: 'Over 9.5 Corners',
  under_95_corners: 'Under 9.5 Corners',
  under_9_5_corners: 'Under 9.5 Corners',
  over_35_cards: 'Over 3.5 Cards',
  over_3_5_cards: 'Over 3.5 Cards',
  under_35_cards: 'Under 3.5 Cards',
  under_3_5_cards: 'Under 3.5 Cards',
  over_25_cards: 'Over 2.5 Cards',
  over_2_5_cards: 'Over 2.5 Cards',
};

const marketIcons: Record<string, string> = {
  over_25_goals: '⚽',
  over_2_5_goals: '⚽',
  under_25_goals: '⚽',
  under_2_5_goals: '⚽',
  btts: '🥅',
  no_btts: '🥅',
  over_85_corners: '🚩',
  over_8_5_corners: '🚩',
  over_95_corners: '🚩',
  over_9_5_corners: '🚩',
  under_95_corners: '🚩',
  under_9_5_corners: '🚩',
  over_35_cards: '🟨',
  over_3_5_cards: '🟨',
  under_35_cards: '🟨',
  under_3_5_cards: '🟨',
  over_25_cards: '🟨',
  over_2_5_cards: '🟨',
};

interface BetBuilderCardProps {
  betBuilder: BetBuilder;
  liveStats?: LiveFixtureStats;
}

export function BetBuilderCard({ betBuilder, liveStats }: BetBuilderCardProps) {
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const [savedFixtureId, setSavedFixtureId] = useState<string | null>(null);
  const [hasAlert, setHasAlert] = useState(false);
  const [briefingSlug, setBriefingSlug] = useState<string | null>(null);
  const { createPreference } = useAlertPreferences();
  const { requestPermission, permission } = useNotifications();
  const { toast } = useToast();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('blog_posts')
      .select('slug')
      .eq('post_type', 'morning-briefing')
      .eq('related_prediction_date', today)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.slug) setBriefingSlug(data.slug);
      });
  }, []);

  const { stats: displayStats } = usePersistentFixtureStats(betBuilder.fixture_id, liveStats);
  
  const isSettled = betBuilder.status === 'won' || betBuilder.status === 'lost';
  const isWin = betBuilder.status === 'won';

  const fixtureIsLive = !!displayStats && isInPlayStatus(displayStats.status);
  const fixtureIsFinished = !!displayStats && isFinishedStatus(displayStats.status);

  const settledTotals = useMemo(() => {
    if (!isSettled) return null;
    const hg = betBuilder.actual_goals_home;
    const ag = betBuilder.actual_goals_away;
    const goalsTotal =
      typeof hg === 'number' && typeof ag === 'number' ? hg + ag : undefined;

    const cornersTotal = typeof betBuilder.actual_corners === 'number' ? betBuilder.actual_corners : undefined;
    const cardsTotal = typeof betBuilder.actual_cards === 'number' ? betBuilder.actual_cards : undefined;

    if (goalsTotal === undefined && cornersTotal === undefined && cardsTotal === undefined) return null;
    return { goalsTotal, cornersTotal, cardsTotal };
  }, [
    isSettled,
    betBuilder.actual_goals_home,
    betBuilder.actual_goals_away,
    betBuilder.actual_corners,
    betBuilder.actual_cards,
  ]);

  const marketOutcomes = useMemo(() => {
    if (!displayStats) return new Map<string, boolean | null>();
    return new Map<string, boolean | null>(
      betBuilder.markets.map((m) => [m, didMarketHit(m, displayStats)])
    );
  }, [betBuilder.markets, displayStats]);

  const provisionalStatus = useMemo<null | 'won' | 'lost'>(() => {
    if (isSettled) return null;
    if (!fixtureIsFinished || !displayStats) return null;

    const outcomes = betBuilder.markets.map((m) => didMarketHit(m, displayStats));
    if (outcomes.some((o) => o === null)) return null;
    return outcomes.every((o) => o === true) ? 'won' : 'lost';
  }, [betBuilder.markets, displayStats, fixtureIsFinished, isSettled]);

  const displayIsSettled = isSettled || provisionalStatus !== null;
  const displayIsWin = isSettled ? isWin : provisionalStatus === 'won';

  // If we don't have stats (rare), keep the existing time-based indicator as a fallback.
  const kickoffTime = new Date(betBuilder.kickoff).getTime();
  const matchStarted = Date.now() > kickoffTime;
  const awaitingResult = betBuilder.status === 'pending' && matchStarted && !fixtureIsLive && !fixtureIsFinished;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const potentialReturn = betBuilder.stake * betBuilder.combined_odds;
  const profitIfWin = potentialReturn - betBuilder.stake;
  const flag = getLeagueFlag(betBuilder.league);

  const handleAlertClick = async () => {
    // Request notification permission but don't block the drawer if denied
    // Users can still use email alerts even without push notifications
    if (permission === 'default') {
      await requestPermission();
    }
    setAlertDrawerOpen(true);
  };

  const handleSaveAlert = async (preference: CreateAlertPreference) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to set up alerts",
          variant: "destructive",
        });
        return;
      }

      // First save the fixture if not already saved
      let fixtureId = savedFixtureId;
      if (!fixtureId) {
        const { data: savedFixture, error: saveError } = await supabase
          .from('saved_fixtures')
          .insert({
            user_id: user.id,
            home_team: betBuilder.home_team,
            away_team: betBuilder.away_team,
            league: betBuilder.league,
            kickoff: betBuilder.kickoff,
            market: betBuilder.markets.join(', '),
            bet_type: 'bet_builder',
          })
          .select()
          .single();

        if (saveError) throw saveError;
        fixtureId = savedFixture.id;
        setSavedFixtureId(fixtureId);
      }

      // Create the alert preference
      await createPreference({
        ...preference,
        saved_fixture_id: fixtureId,
      });

      setHasAlert(true);
      setAlertDrawerOpen(false);
      
      toast({
        title: "🔔 Alert Set!",
        description: "You'll be notified when this bet hits key milestones",
      });
    } catch (error) {
      console.error('Error saving alert:', error);
      toast({
        title: "Error",
        description: "Failed to save alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
    <AlertPreferencesDrawer
      open={alertDrawerOpen}
      onOpenChange={setAlertDrawerOpen}
      fixtureId={betBuilder.fixture_id}
      market={betBuilder.markets.join(', ')}
      homeTeam={betBuilder.home_team}
      awayTeam={betBuilder.away_team}
      onSave={handleSaveAlert}
    />
    <Card className={cn(
      "overflow-hidden transition-all duration-300 hover:shadow-lg border-2 shadow-lg",
      displayIsSettled && displayIsWin && "border-[hsl(var(--neon-green)/.5)] bg-[hsl(var(--neon-green)/.06)] animate-neon-pulse",
      displayIsSettled && !displayIsWin && "border-destructive/50 bg-destructive/5",
      fixtureIsLive && !displayIsSettled && "border-[hsl(var(--neon-green)/.4)] bg-gradient-to-br from-[hsl(var(--neon-green)/.08)] via-card to-card shadow-[0_0_20px_hsl(var(--neon-green)/.15)]",
      !displayIsSettled && !fixtureIsLive && "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary/50 hover:shadow-primary/20"
    )}>
      <CardContent className="p-5">
        {/* Header with flag */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
              fixtureIsLive ? "bg-[hsl(var(--neon-green))] shadow-[0_0_12px_hsl(var(--neon-green)/.3)]" : "bg-gradient-to-br from-primary to-navy shadow-primary/20"
            )}>
              {fixtureIsLive ? <Radio className="w-5 h-5 text-black animate-pulse" /> : <Layers className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">Bet Builder of the Day</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-base">{flag}</span>
                {betBuilder.league}
              </p>
              {betBuilder.bookmaker && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Best odds</span>
                  <BookmakerLogo bookmaker={betBuilder.bookmaker} />
                </div>
              )}
            </div>
          </div>
          <MatchStatusBadge
            stats={displayStats}
            kickoff={betBuilder.kickoff}
            status={betBuilder.status}
            isSettled={displayIsSettled}
            isWon={displayIsWin}
          />
        </div>

        {/* Match with Live Score */}
        <div className="text-center mb-4">
          {displayStats && (fixtureIsLive || fixtureIsFinished) ? (
            <LiveScore stats={displayStats} homeTeam={betBuilder.home_team} awayTeam={betBuilder.away_team} />
          ) : (
            <p className="text-lg font-bold">
              {betBuilder.home_team} <span className="text-muted-foreground">vs</span> {betBuilder.away_team}
            </p>
          )}
        </div>

        {/* Per-Market Live Progress Trackers - replaces old totals grid + market tiles */}
        {displayStats && (fixtureIsLive || fixtureIsFinished || isSettled) && (
          <div className="grid gap-2 mb-4">
            {betBuilder.markets.map((market) => {
              const legOutcome = isSettled ? (displayIsWin ? true : didMarketHit(market, displayStats) ?? false) : undefined;
              return (
                <LiveMarketTracker
                  key={market}
                  market={market}
                  stats={displayStats}
                  isSettled={isSettled}
                  isWon={legOutcome === true}
                />
              );
            })}
          </div>
        )}

        {/* Markets Grid - show when NOT live/finished (pre-match) */}
        {!displayStats || (!fixtureIsLive && !fixtureIsFinished && !isSettled) ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {betBuilder.markets.map((market) => {
              const confidence = betBuilder.market_confidences[market];
              const displayConfidence = typeof confidence === 'number' 
                ? Math.round(confidence <= 1 ? confidence * 100 : confidence) 
                : null;
              const label = marketLabels[market] || market.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

              return (
                <div
                  key={market}
                  className="bg-background/50 rounded-lg p-2.5 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{marketIcons[market] || '📊'}</span>
                    <span className="text-xs font-medium flex-1">{label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-bold">{displayConfidence ?? '—'}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Combined Stats - Bold & Bright */}
        <div className="flex flex-col gap-3 mb-4">
          {/* Bet365 badge row */}
          <div className="flex justify-center">
            <Bet365Badge odds={Number(betBuilder.combined_odds)} size="md" />
          </div>
          {/* Confidence + Profit row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl ring-1 ring-white/10 bg-gradient-to-b from-primary/25 to-primary/5 border-2 border-primary/40 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.9)]">
              <div className="text-xl font-black text-primary">{Math.round(betBuilder.average_confidence <= 1 ? betBuilder.average_confidence * 100 : betBuilder.average_confidence)}%</div>
              <div className="text-[10px] text-foreground/60 font-semibold uppercase">Avg Confidence</div>
            </div>
            <div className="text-center p-3 rounded-xl ring-1 ring-white/10 bg-gradient-to-b from-success/35 to-success/10 border-2 border-success/80 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.9)]">
              <div className="text-xl font-black text-success">+£{profitIfWin.toFixed(2)}</div>
              <div className="text-[10px] text-foreground/60 font-semibold uppercase">Potential Profit</div>
            </div>
          </div>
        </div>

        {/* Stats & Facts + Gaffer's Reasoning */}
        {betBuilder.gaffer_reasoning && (() => {
          const { statsFacts, gafferTake } = parseReasoning(betBuilder.gaffer_reasoning);
          return (
            <div className="space-y-2">
              {/* Stats & Facts - Teal box */}
              {statsFacts && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[hsl(var(--stats)/.20)] to-[hsl(var(--stats)/.08)] border-2 border-[hsl(var(--stats)/.80)] shadow-[0_0_10px_-4px_hsl(var(--stats)/.35)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-[hsl(var(--stats)/.40)] flex items-center justify-center">
                      <span className="text-xs">📊</span>
                    </div>
                    <span className="text-xs font-bold text-[hsl(var(--stats))] uppercase tracking-wider">Stats & Facts</span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                    {statsFacts}
                  </p>
                </div>
              )}
              {/* The Gaffer's Take - Neon Yellow box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-yellow)/.20)] to-[hsl(var(--neon-yellow)/.08)] border-2 border-[hsl(var(--neon-yellow)/.80)] shadow-[0_0_10px_-4px_hsl(var(--neon-yellow)/.35)]">
                <div className="flex items-start gap-3">
                  <img 
                    src={theGafferImage} 
                    alt="The Gaffer" 
                    className="w-10 h-10 rounded-full border-2 border-[hsl(var(--neon-yellow)/.80)] shadow-none flex-shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-[hsl(var(--neon-yellow))] uppercase tracking-wider block mb-1.5">The Gaffer Says</span>
                    <p className="text-sm text-foreground/85 leading-relaxed">
                      "{gafferTake}"
                    </p>
                    {briefingSlug && (
                      <Link 
                        to={`/blog/${briefingSlug}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[hsl(var(--neon-yellow))] hover:text-[hsl(var(--neon-yellow)/.80)] transition-colors"
                      >
                        📖 Read The Gaffer's Full Briefing →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Settled Results */}
        {isSettled && (
          <div className={cn(
            "mt-4 p-3 rounded-lg text-center",
            isWin ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"
          )}>
            <div className="flex items-center justify-center gap-2">
              <Zap className={cn("w-4 h-4", isWin ? "text-success" : "text-destructive")} />
              <span className="font-bold">
                {isWin ? `+£${betBuilder.profit_loss?.toFixed(2)}` : `-£${betBuilder.stake.toFixed(2)}`}
              </span>
            </div>
            {betBuilder.result && (
              <p className="text-xs text-muted-foreground mt-1">
                Result: {betBuilder.result}
              </p>
            )}
          </div>
        )}

        {/* Stake Info + Alert Button */}
        {!isSettled && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Stake: </span>
              <span className="font-bold">£{betBuilder.stake.toFixed(2)}</span>
            </div>
            <Button
              variant={hasAlert ? "secondary" : "outline"}
              size="sm"
              onClick={handleAlertClick}
              className={cn(
                "gap-1.5",
                hasAlert && "bg-primary/20 text-primary border-primary/30"
              )}
            >
              {hasAlert ? (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  Alert Set
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  Set Alert
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
