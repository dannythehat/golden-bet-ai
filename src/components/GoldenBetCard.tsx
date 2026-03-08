import { useMemo, useState, useEffect } from 'react';
import { parseReasoning } from '@/lib/parseReasoning';
import { Link } from 'react-router-dom';
import { GoldenBet, BOOKMAKER_LOGOS } from '@/types/betting';
import { marketLabels, marketIcons } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Clock, CheckCircle2, XCircle, Bell, BellRing, Radio, Target, Flag, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLeagueFlag } from '@/lib/countryFlags';
import theGafferImage from '@/assets/the-gaffer.webp';
import { formatTeamName } from '@/lib/teamNames';
import { Bet365Badge } from '@/components/Bet365Badge';
import { AlertPreferencesDrawer } from '@/components/AlertPreferencesDrawer';
import { useAlertPreferences, CreateAlertPreference } from '@/hooks/useAlertPreferences';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';
import { useStickyFixtureStats } from '@/hooks/useStickyFixtureStats';
import { isFinishedStatus, isInPlayStatus } from '@/lib/fixtureStatus';
import { didMarketHit } from '@/lib/marketEval';
import { getMarketIcon, getMarketLabel, normalizeMarketKey } from '@/lib/marketDisplay';
import { LiveMarketTracker, LiveScore, MatchStatusBadge } from '@/components/LiveMarketTracker';

// Fallback bookmaker logo component
const BookmakerLogo = ({ bookmaker, size = 'sm' }: { bookmaker?: { key: string; title: string; logo?: string }; size?: 'sm' | 'lg' }) => {
  if (!bookmaker) return null;
  
  const logoUrl = bookmaker.logo || BOOKMAKER_LOGOS[bookmaker.key];
  const sizeClass = size === 'lg' ? 'h-6 max-w-[100px]' : 'h-4 max-w-[70px]';
  
  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={bookmaker.title}
        className={cn("w-auto object-contain", sizeClass)}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  
  return (
    <span className={cn(
      "font-semibold",
      size === 'lg' ? 'text-sm text-foreground' : 'text-xs text-muted-foreground'
    )}>
      {bookmaker.title}
    </span>
  );
};

interface GoldenBetCardProps {
  bet: GoldenBet;
  index: number;
  liveStats?: LiveFixtureStats;
}

export function GoldenBetCard({ bet, index, liveStats }: GoldenBetCardProps) {
  const [alertDrawerOpen, setAlertDrawerOpen] = useState(false);
  const [savedFixtureId, setSavedFixtureId] = useState<string | null>(null);
  const [hasAlert, setHasAlert] = useState(false);
  const [briefingSlug, setBriefingSlug] = useState<string | null>(null);
  const { createPreference } = useAlertPreferences();
  const { requestPermission, permission } = useNotifications();
  const { toast } = useToast();
  const { stats: displayStats } = useStickyFixtureStats(liveStats);

  // Fetch today's morning briefing slug
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

  const marketKey = normalizeMarketKey((bet as any)?.market) || 'unknown_market';

  const isSettled = bet.status === 'won' || bet.status === 'lost';
  const isWin = bet.status === 'won';

  const fixtureIsLive = !!displayStats && isInPlayStatus(displayStats.status);
  const fixtureIsFinished = !!displayStats && isFinishedStatus(displayStats.status);
  const showScore = !!displayStats && (fixtureIsLive || fixtureIsFinished);

  const provisionalStatus = useMemo<null | 'won' | 'lost'>(() => {
    if (isSettled) return null;
    if (!fixtureIsFinished || !displayStats) return null;
    const hit = didMarketHit(marketKey, displayStats);
    if (hit === null) return null;
    return hit ? 'won' : 'lost';
  }, [displayStats, fixtureIsFinished, isSettled, marketKey]);

  const displayIsSettled = isSettled || provisionalStatus !== null;
  const displayIsWin = isSettled ? isWin : provisionalStatus === 'won';

  const kickoffTime = new Date(bet.kickoff).getTime();
  const matchStarted = Date.now() > kickoffTime;
  const awaitingResult = bet.status === 'pending' && matchStarted && !fixtureIsLive && !fixtureIsFinished;
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get relevant live stat based on market type
  const getRelevantStat = () => {
    if (!displayStats) return null;
    const market = marketKey;
    
    // BTTS - show both team scores
    if (market.includes('btts')) {
      const homeScored = displayStats.score_home > 0;
      const awayScored = displayStats.score_away > 0;
      const bttsHit = homeScored && awayScored;
      return { 
        label: 'BTTS', 
        value: bttsHit ? 2 : (homeScored || awayScored ? 1 : 0), 
        target: 2, 
        icon: <Target className="w-4 h-4" />,
        isBTTS: true,
        homeScored,
        awayScored,
        scoreHome: displayStats.score_home,
        scoreAway: displayStats.score_away,
      };
    }
    
    // Goals markets
    if (market.includes('goal') || market.includes('2.5') || market.includes('25')) {
      const totalGoals = displayStats.score_home + displayStats.score_away;
      const target = market.includes('2.5') || market.includes('25') ? 3 : 
                     market.includes('1.5') || market.includes('15') ? 2 : 3;
      return { label: 'Goals', value: totalGoals, target, icon: <Target className="w-4 h-4" /> };
    }
    
    // Corners markets
    if (market.includes('corner')) {
      const target = market.includes('9.5') || market.includes('95') ? 10 : 
                     market.includes('10.5') || market.includes('105') ? 11 : 10;
      return { label: 'Corners', value: displayStats.corners_total, target, icon: <Flag className="w-4 h-4" /> };
    }
    
    // Cards markets (includes yellow + red)
    if (market.includes('card')) {
      const target = market.includes('3.5') || market.includes('35') ? 4 : 
                     market.includes('2.5') || market.includes('25') ? 3 : 3;
      const redCards = displayStats.red_cards_home + displayStats.red_cards_away;
      return { 
        label: 'Cards', 
        value: displayStats.cards_total, 
        target, 
        icon: <Square className="w-4 h-4 fill-amber-400 text-amber-400" />,
        redCards,
      };
    }
    
    return null;
  };

  const relevantStat = getRelevantStat();
  const isOnTrack = relevantStat && (relevantStat.isBTTS 
    ? (relevantStat.homeScored || relevantStat.awayScored)
    : relevantStat.value >= relevantStat.target * 0.5);

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
            home_team: bet.homeTeam,
            away_team: bet.awayTeam,
            league: bet.league,
            kickoff: bet.kickoff,
            bet_type: 'golden_bet',
            market: marketKey,
            odds: bet.bookmakerOdds,
          })
          .select('id')
          .single();

        if (saveError) {
          console.error('Error saving fixture:', saveError);
          throw saveError;
        }
        fixtureId = savedFixture.id;
        setSavedFixtureId(fixtureId);
      }

      // Now create the alert preference
      await createPreference({
        ...preference,
        saved_fixture_id: fixtureId,
      });

      setHasAlert(true);
    } catch (error) {
      console.error('Error setting up alert:', error);
      toast({
        title: "Error",
        description: "Failed to set up alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  const flag = getLeagueFlag(bet.league);
  const homeTeam = formatTeamName(bet.homeTeam);
  const awayTeam = formatTeamName(bet.awayTeam);

  return (
    <div className={cn(
      "rounded-xl p-3.5 md:p-5 relative overflow-hidden group border-2 shadow-lg transition-all duration-300",
      displayIsSettled && displayIsWin && "border-[hsl(var(--neon-green)/.5)] bg-[hsl(var(--neon-green)/.06)] animate-neon-pulse",
      displayIsSettled && !displayIsWin && "border-destructive/50 bg-destructive/5",
      fixtureIsLive && !displayIsSettled && "border-[hsl(var(--neon-green)/.4)] bg-gradient-to-br from-[hsl(var(--neon-green)/.08)] via-card to-card shadow-[0_0_20px_hsl(var(--neon-green)/.15)]",
      !displayIsSettled && !fixtureIsLive && "border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card hover:border-gold/50 hover:shadow-gold/20"
    )}>
      {/* Status Badge - top right */}
      <div className="absolute top-0 right-0">
        <MatchStatusBadge
          stats={displayStats}
          kickoff={bet.kickoff}
          status={bet.status}
          isSettled={displayIsSettled}
          isWon={displayIsWin}
        />
      </div>
      
      {/* Top badge with flag */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm",
             displayIsSettled && displayIsWin ? "bg-[hsl(var(--neon-green))]" : isSettled ? "bg-destructive" : fixtureIsLive ? "bg-[hsl(var(--neon-green))]" : "gold-gradient"
          )}>
            {index + 1}
          </div>
          <span className="text-lg" title={bet.league}>{flag}</span>
          <span className="text-sm text-muted-foreground">{bet.league}</span>
        </div>
        {!displayIsSettled && !fixtureIsLive && !fixtureIsFinished && !awaitingResult && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(bet.kickoff)}
          </div>
        )}
      </div>

      {/* Teams with Live Score */}
      <div className="mb-4">
        {showScore && displayStats ? (
          <LiveScore stats={displayStats} homeTeam={homeTeam} awayTeam={awayTeam} />
        ) : (
          <>
            <div className="text-base md:text-lg font-semibold text-foreground">{homeTeam}</div>
            <div className="text-muted-foreground text-sm">vs</div>
            <div className="text-base md:text-lg font-semibold text-foreground">{awayTeam}</div>
          </>
        )}
      </div>

      {/* Live Market Progress Tracker */}
      {showScore && displayStats && (
        <div className="mb-4">
          <LiveMarketTracker
            market={marketKey}
            stats={displayStats}
            isSettled={displayIsSettled}
            isWon={displayIsWin}
          />
        </div>
      )}

      {/* Market Badge - Always show */}
      <Badge variant={isSettled && isWin ? 'default' : isSettled ? 'destructive' : 'gold'} className="mb-4">
        <span className="mr-1.5">{marketIcons[marketKey] || getMarketIcon(marketKey)}</span>
        {marketLabels[marketKey] || getMarketLabel(marketKey)}
      </Badge>

      {/* Stats & Facts + Gaffer Reasoning */}
      {bet.gafferReasoning && (() => {
        const { statsFacts, gafferTake } = parseReasoning(bet.gafferReasoning);
        return (
          <div className="mb-4 space-y-2">
            {/* Stats & Facts - Neon Blue box */}
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
                  className="w-10 h-10 rounded-full object-cover border-2 border-[hsl(var(--neon-yellow)/.80)] shadow-none shrink-0"
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

      {/* Stats Grid - Show P/L when settled */}
      {isSettled ? (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="p-3 rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/50 text-center">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Result</div>
            <div className={cn(
              "text-xl font-bold",
              isWin ? "text-success" : "text-destructive"
            )}>
              {isWin ? 'WON ✓' : 'LOST ✗'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/50 text-center">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Profit/Loss</div>
            <div className={cn(
              "text-xl font-bold",
              isWin ? "text-success" : "text-destructive"
            )}>
              {isWin ? '+' : ''}£{(bet.profitLoss || 0).toFixed(2)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/50">
          {/* Confidence Box */}
          <div className="p-3 rounded-xl bg-gradient-to-b from-gold/20 to-gold/5 border-2 border-gold/40 text-center shadow-md">
            <div className="text-xs text-gold/80 mb-1 uppercase tracking-wide font-medium">Gaffer Confidence</div>
            <div className="text-2xl font-black text-gold">
              {(bet.mlConfidence * 100).toFixed(0)}%
            </div>
          </div>
          
          {/* Odds Box with Bet365 */}
          <div className="p-3 rounded-xl bg-gradient-to-b from-[#1a3a1a]/60 to-[#1a3a1a]/30 border-2 border-[#2d6b2d]/50 text-center shadow-md flex items-center justify-center overflow-hidden">
            <Bet365Badge odds={bet.bookmakerOdds} size="md" />
          </div>
        </div>
      )}

      {/* Value Edge - Only show when pending */}
      {!isSettled && (
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-success/15 to-success/5 border-2 border-success/40 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-success">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">Value Edge</span>
            </div>
            <span className="text-success font-black text-lg">
              +{(bet.valueEdge * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Alert Button - Only show when pending */}
      {!isSettled && (
        <Button
          variant={hasAlert ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "w-full mt-4 gap-2",
            hasAlert && "bg-primary/10 border-primary/30 text-primary"
          )}
          onClick={handleAlertClick}
        >
          {hasAlert ? (
            <>
              <BellRing className="w-4 h-4" />
              Alert Active
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Set Up Alerts
            </>
          )}
        </Button>
      )}
      
      {/* Settled summary */}
      {isSettled && (
        <div className={cn(
          "mt-4 p-3 rounded-xl border-2",
          isWin ? "bg-success/10 border-success/40" : "bg-destructive/10 border-destructive/40"
        )}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              £{bet.stake || 10} stake @ {bet.bookmakerOdds.toFixed(2)}
            </div>
            <div className={cn(
              "font-bold",
              isWin ? "text-success" : "text-destructive"
            )}>
              {isWin ? `Returns £${((bet.stake || 10) * bet.bookmakerOdds).toFixed(2)}` : 'Lost stake'}
            </div>
          </div>
        </div>
      )}

      {/* Alert Preferences Drawer */}
      <AlertPreferencesDrawer
        open={alertDrawerOpen}
        onOpenChange={setAlertDrawerOpen}
        fixtureId={savedFixtureId || 'temp'}
        market={marketKey}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSave={handleSaveAlert}
      />
    </div>
  );
}
