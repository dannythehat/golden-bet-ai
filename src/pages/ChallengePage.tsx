import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Target, Calendar, Trophy, ArrowRight, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import challengeHero from '@/assets/challenge-hero.jpg';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { useState } from 'react';

interface ChallengeDay {
  id: string;
  day_number: number;
  challenge_date: string;
  starting_balance: number;
  stake_amount: number;
  total_returns: number;
  profit_loss: number;
  closing_balance: number | null;
  status: string;
  bets_won: number;
  bets_lost: number;
  bets_total: number;
  balance_proof_url: string | null;
  bets_proof_url: string | null;
  results_proof_url: string | null;
  morning_article_slug: string | null;
  results_article_slug: string | null;
  gaffer_commentary: string | null;
  golden_bet_ids: string[] | null;
  bet_builder_ids: string[] | null;
  acca_id: string | null;
}

interface GoldenBet {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  ml_confidence: number;
  bookmaker_odds: number | null;
  status: string;
  result: string | null;
  profit_loss: number | null;
  stake: number | null;
  kickoff: string;
  gaffer_reasoning: string;
}

interface BetBuilder {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  markets: string[];
  combined_odds: number;
  average_confidence: number;
  status: string;
  result: string | null;
  profit_loss: number | null;
  stake: number | null;
  kickoff: string;
  gaffer_reasoning: string;
}

interface Acca {
  id: string;
  selections: any;
  combined_odds: number;
  average_confidence: number;
  status: string;
  profit_loss: number | null;
  stake: number | null;
  legs_won: number | null;
  legs_lost: number | null;
  gaffer_reasoning: string;
}

interface BlogPostLink {
  slug: string;
  title: string;
  published_at: string;
  excerpt: string;
  hero_image_url: string | null;
}

const marketLabels: Record<string, string> = {
  'over_2_5_goals': 'Over 2.5 Goals',
  'over_9_5_corners': 'Over 8.5 Corners',
  'over_3_5_cards': 'Over 3.5 Cards',
};

export default function ChallengePage() {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const { data: days, isLoading } = useQuery({
    queryKey: ['challenge-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_log')
        .select('*')
        .order('day_number', { ascending: true });
      if (error) throw error;
      return data as ChallengeDay[];
    },
  });

  // Fetch today's / latest day's actual bets
  const latestDay = days?.[days.length - 1];

  const { data: goldenBets } = useQuery({
    queryKey: ['challenge-golden-bets', latestDay?.golden_bet_ids],
    queryFn: async () => {
      if (!latestDay?.golden_bet_ids?.length) return [];
      const { data, error } = await supabase
        .from('golden_bet_history')
        .select('*')
        .in('id', latestDay.golden_bet_ids);
      if (error) throw error;
      return data as GoldenBet[];
    },
    enabled: !!latestDay?.golden_bet_ids?.length,
  });

  const { data: betBuilders } = useQuery({
    queryKey: ['challenge-bet-builders', latestDay?.bet_builder_ids],
    queryFn: async () => {
      if (!latestDay?.bet_builder_ids?.length) return [];
      const { data, error } = await supabase
        .from('bet_builder_history')
        .select('*')
        .in('id', latestDay.bet_builder_ids);
      if (error) throw error;
      return data as BetBuilder[];
    },
    enabled: !!latestDay?.bet_builder_ids?.length,
  });

  const { data: acca } = useQuery({
    queryKey: ['challenge-acca', latestDay?.acca_id],
    queryFn: async () => {
      if (!latestDay?.acca_id) return null;
      const { data, error } = await supabase
        .from('acca_history')
        .select('*')
        .eq('id', latestDay.acca_id)
        .single();
      if (error) throw error;
      return data as Acca;
    },
    enabled: !!latestDay?.acca_id,
  });

  // Fetch latest challenge articles (recap + morning)
  const { data: challengeArticles } = useQuery({
    queryKey: ['challenge-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('slug, title, published_at, excerpt, hero_image_url')
        .eq('is_published', true)
        .eq('category', 'challenge')
        .order('published_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as BlogPostLink[];
    },
  });

  const currentBalance = latestDay?.closing_balance ?? latestDay?.starting_balance ?? 100;
  const totalProfit = days?.reduce((sum, d) => sum + (d.profit_loss || 0), 0) ?? 0;
  const totalStaked = days?.reduce((sum, d) => sum + (d.stake_amount || 0), 0) ?? 0;
  const totalROI = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const totalWins = days?.reduce((sum, d) => sum + (d.bets_won || 0), 0) ?? 0;
  const totalLosses = days?.reduce((sum, d) => sum + (d.bets_lost || 0), 0) ?? 0;
  const progress = Math.min(((currentBalance - 100) / 900) * 100, 100);

  // Balance chart data
  const chartData = days?.map(d => ({
    name: `Day ${d.day_number}`,
    balance: d.closing_balance ?? d.starting_balance,
    day: d.day_number,
  })) ?? [];

  const previousDays = days ? [...days].reverse().slice(1) : [];

  const getStatusIcon = (status: string) => {
    if (status === 'won') return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === 'lost') return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1 max-w-6xl">
        {/* Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-gold/10">
          <img src={challengeHero} alt="€100 to €1,000 Challenge" className="w-full h-48 md:h-72 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <Badge className="bg-gold/20 text-gold border-gold/30 text-sm px-4 py-1 mb-3">
              🏆 LIVE CHALLENGE
            </Badge>
            <h1 className="text-3xl md:text-5xl font-extrabold">
              <span className="gold-text">€100</span>{' '}
              <span className="text-foreground">to</span>{' '}
              <span className="gold-text">€1,000</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm md:text-base">
              Can The Gaffer turn €100 into €1,000 using only AI picks? Every day, 20% goes on 6 bets. Full transparency.
            </p>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="glass-card rounded-xl p-4 text-center border border-gold/20">
            <div className="text-xs text-muted-foreground mb-1">Balance</div>
            <div className="text-2xl font-black gold-text">€{currentBalance.toFixed(2)}</div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total P&L</div>
            <div className={`text-2xl font-black ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalProfit >= 0 ? '+' : ''}€{totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center border border-success/20">
            <div className="text-xs text-muted-foreground mb-1">ROI on Stakes</div>
            <div className={`text-2xl font-black ${totalROI >= 0 ? 'text-success' : 'text-destructive'}`}>
              {totalROI >= 0 ? '+' : ''}{totalROI.toFixed(1)}%
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
            <div className="text-2xl font-black text-primary">
              {totalWins + totalLosses > 0 ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(0) : '0'}%
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Days</div>
            <div className="text-2xl font-black text-foreground">{days?.length ?? 0}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="glass-card rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Progress to €1,000</span>
            <span className="text-sm font-bold gold-text">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold to-gold-glow transition-all duration-1000"
              style={{ width: `${Math.max(progress, 1)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>€100</span>
            <span>€1,000</span>
          </div>
        </div>

        {/* Balance Journey Chart */}
        {chartData.length > 1 && (
          <div className="glass-card rounded-xl p-5 mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              📈 Balance Journey
            </h2>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--gold))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, 'Balance']}
                  />
                  <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Start €100', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <ReferenceLine y={1000} stroke="hsl(var(--gold))" strokeDasharray="3 3" label={{ value: 'Target €1,000', fill: 'hsl(var(--gold))', fontSize: 10 }} />
                  <Area type="monotone" dataKey="balance" stroke="hsl(var(--gold))" strokeWidth={3} fill="url(#balanceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Today's Bets - Featured */}
        {latestDay && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              🎯 Day {latestDay.day_number} — {latestDay.status === 'settled' ? 'Results' : "Today's Bets"}
            </h2>

            <div className="glass-card rounded-xl p-5 border-2 border-gold/20 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-gold/20 text-gold border-gold/30 font-bold text-base px-4 py-1">
                    Day {latestDay.day_number}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(latestDay.challenge_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <Badge variant="outline" className={
                  latestDay.status === 'settled'
                    ? (latestDay.profit_loss >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30')
                    : 'bg-gold/10 text-gold border-gold/30'
                }>
                  {latestDay.status === 'settled' ? (latestDay.profit_loss >= 0 ? '✅ Profit Day' : '❌ Loss Day') : '⏳ In Play'}
                </Badge>
              </div>

              {/* Balance summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground block text-xs">Opening</span>
                  <span className="font-bold text-foreground">€{latestDay.starting_balance.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground block text-xs">Staked</span>
                  <span className="font-bold text-foreground">€{latestDay.stake_amount.toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground block text-xs">Returns</span>
                  <span className="font-bold text-foreground">€{(latestDay.total_returns || 0).toFixed(2)}</span>
                </div>
                <div className="p-3 rounded-lg bg-gold/10 border border-gold/20">
                  <span className="text-muted-foreground block text-xs">Closing</span>
                  <span className="font-bold gold-text">€{(latestDay.closing_balance ?? latestDay.starting_balance).toFixed(2)}</span>
                </div>
              </div>

              {/* Actual bet cards */}
              <div className="space-y-3">
                {goldenBets && goldenBets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gold mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Golden Bets
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {goldenBets.map(bet => (
                        <div key={bet.id} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-foreground">{bet.home_team} vs {bet.away_team}</span>
                            {getStatusIcon(bet.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>{bet.league}</span>
                            <Badge variant="outline" className="text-xs">{marketLabels[bet.market] || bet.market}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>ML: <span className="gold-text font-bold">{(bet.ml_confidence * 100).toFixed(0)}%</span></span>
                            <span>Odds: <span className="font-bold">{bet.bookmaker_odds?.toFixed(2) ?? '—'}</span></span>
                            <span>Stake: <span className="font-bold">€{bet.stake?.toFixed(2) ?? '—'}</span></span>
                            {bet.status === 'won' && bet.profit_loss != null && (
                              <span className="text-success font-bold">+€{bet.profit_loss.toFixed(2)}</span>
                            )}
                            {bet.status === 'lost' && bet.stake != null && (
                              <span className="text-destructive font-bold">-€{bet.stake.toFixed(2)}</span>
                            )}
                          </div>
                          {bet.result && <div className="text-xs text-muted-foreground mt-1">Result: {bet.result}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {betBuilders && betBuilders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      🔧 Bet Builders
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {betBuilders.map(bb => (
                        <div key={bb.id} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-foreground">{bb.home_team} vs {bb.away_team}</span>
                            {getStatusIcon(bb.status)}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground mb-1">
                            <span>{bb.league}</span>
                            {bb.markets.map(m => (
                              <Badge key={m} variant="outline" className="text-xs">{marketLabels[m] || m}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Odds: <span className="font-bold">{bb.combined_odds.toFixed(2)}</span></span>
                            <span>Stake: <span className="font-bold">€{bb.stake?.toFixed(2) ?? '—'}</span></span>
                            {bb.status === 'won' && bb.profit_loss != null && (
                              <span className="text-success font-bold">+€{bb.profit_loss.toFixed(2)}</span>
                            )}
                            {bb.status === 'lost' && bb.stake != null && (
                              <span className="text-destructive font-bold">-€{bb.stake.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {acca && (
                  <div>
                    <h3 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
                      🎰 ACCA Delight
                    </h3>
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-foreground">
                          {Array.isArray(acca.selections) ? `${(acca.selections as any[]).length}-fold Accumulator` : 'Accumulator'}
                        </span>
                        {getStatusIcon(acca.status)}
                      </div>
                      {Array.isArray(acca.selections) && (
                        <div className="space-y-1 mb-2">
                          {(acca.selections as any[]).map((sel: any, i: number) => (
                            <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="text-foreground">{sel.home_team || sel.homeTeam} vs {sel.away_team || sel.awayTeam}</span>
                              <Badge variant="outline" className="text-xs">{marketLabels[sel.market] || sel.market}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span>Combined Odds: <span className="font-bold">{acca.combined_odds.toFixed(2)}</span></span>
                        <span>Stake: <span className="font-bold">€{acca.stake?.toFixed(2) ?? '—'}</span></span>
                        {acca.legs_won != null && <span className="text-muted-foreground">Legs: {acca.legs_won}W / {acca.legs_lost}L</span>}
                        {acca.status === 'won' && acca.profit_loss != null && (
                          <span className="text-success font-bold">+€{acca.profit_loss.toFixed(2)}</span>
                        )}
                        {acca.status === 'lost' && acca.stake != null && (
                          <span className="text-destructive font-bold">-€{acca.stake.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!goldenBets?.length && !betBuilders?.length && !acca && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gold" />
                    Bets will appear here once today's selections are generated.
                  </div>
                )}
              </div>

              {/* Gaffer Commentary */}
              {latestDay.gaffer_commentary && (
                <p className="text-sm text-muted-foreground italic border-t border-border/20 pt-3 mt-4">
                  🎩 "{latestDay.gaffer_commentary}"
                </p>
              )}

              {/* Proof images */}
              <div className="flex flex-wrap gap-2 mt-4">
                {latestDay.balance_proof_url && (
                  <a href={latestDay.balance_proof_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">📸 Balance Proof</Badge>
                  </a>
                )}
                {latestDay.bets_proof_url && (
                  <a href={latestDay.bets_proof_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">📸 Bets Proof</Badge>
                  </a>
                )}
                {latestDay.results_proof_url && (
                  <a href={latestDay.results_proof_url} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">📸 Results Proof</Badge>
                  </a>
                )}
                {latestDay.morning_article_slug && (
                  <Link to={`/blog/${latestDay.morning_article_slug}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-gold/10 text-gold border-gold/30 text-xs">📝 Morning Preview</Badge>
                  </Link>
                )}
                {latestDay.results_article_slug && (
                  <Link to={`/blog/${latestDay.results_article_slug}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-success/10 text-success border-success/30 text-xs">📊 Results Recap</Badge>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* The Gaffer's Latest Articles */}
        {challengeArticles && challengeArticles.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              📰 The Gaffer's Challenge Diary
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {challengeArticles.slice(0, 4).map(article => (
                <Link
                  key={article.slug}
                  to={`/blog/${article.slug}`}
                  className="glass-card rounded-xl overflow-hidden group hover:border-gold/30 border border-border/20 transition-all hover:shadow-lg hover:shadow-gold/5"
                >
                  {article.hero_image_url && (
                    <img src={article.hero_image_url} alt={article.title} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground group-hover:text-gold transition-colors text-sm line-clamp-2">{article.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="glass-card rounded-xl p-6 mb-8 border border-gold/20">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-gold" /> How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="p-4 rounded-lg bg-gold/5 border border-gold/15">
              <div className="text-gold font-bold mb-1">💰 The Stake</div>
              <p>20% of the current balance is split across 6 daily bets from our AI picks.</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/15">
              <div className="text-primary font-bold mb-1">📊 The Picks</div>
              <p>2x Golden Bet Doubles, 2x Golden Bet Trebles, 1x Bet Builder, 1x ACCA Delight.</p>
            </div>
            <div className="p-4 rounded-lg bg-success/5 border border-success/15">
              <div className="text-success font-bold mb-1">🎯 The Goal</div>
              <p>Compound winnings until we hit €1,000. Every bet tracked, every result proven.</p>
            </div>
          </div>
        </div>

        {/* Previous Days (compact accordion) */}
        {previousDays.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Previous Days
            </h2>
            <div className="space-y-2">
              {previousDays.map(day => (
                <div key={day.id} className="glass-card rounded-xl border border-border/30 overflow-hidden">
                  <button
                    onClick={() => setExpandedDay(expandedDay === day.id ? null : day.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gold/20 text-gold border-gold/30 font-bold text-xs">
                        Day {day.day_number}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(day.challenge_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <Badge variant="outline" className={`text-xs ${
                        day.status === 'settled'
                          ? (day.profit_loss >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30')
                          : 'bg-gold/10 text-gold border-gold/30'
                      }`}>
                        {day.status === 'settled' ? (day.profit_loss >= 0 ? '✅' : '❌') : '⏳'}{' '}
                        {day.status === 'settled' ? `${day.profit_loss >= 0 ? '+' : ''}€${day.profit_loss.toFixed(2)}` : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold gold-text">€{(day.closing_balance ?? day.starting_balance).toFixed(2)}</span>
                      {expandedDay === day.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {expandedDay === day.id && (
                    <div className="px-4 pb-4 border-t border-border/20 pt-3 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Start: </span><span className="font-semibold">€{day.starting_balance.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Staked: </span><span className="font-semibold">€{day.stake_amount.toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Returns: </span><span className="font-semibold">€{(day.total_returns || 0).toFixed(2)}</span></div>
                        <div><span className="text-muted-foreground">Record: </span><span className="font-semibold">{day.bets_won}W / {day.bets_lost}L</span></div>
                      </div>
                      {day.gaffer_commentary && (
                        <p className="text-sm text-muted-foreground italic">🎩 "{day.gaffer_commentary}"</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {day.balance_proof_url && (
                          <a href={day.balance_proof_url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">📸 Balance</Badge>
                          </a>
                        )}
                        {day.bets_proof_url && (
                          <a href={day.bets_proof_url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">📸 Bets</Badge>
                          </a>
                        )}
                        {day.results_proof_url && (
                          <a href={day.results_proof_url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 text-xs">📸 Results</Badge>
                          </a>
                        )}
                        {day.morning_article_slug && (
                          <Link to={`/blog/${day.morning_article_slug}`}>
                            <Badge variant="outline" className="cursor-pointer hover:bg-gold/10 text-gold border-gold/30 text-xs">📝 Preview</Badge>
                          </Link>
                        )}
                        {day.results_article_slug && (
                          <Link to={`/blog/${day.results_article_slug}`}>
                            <Badge variant="outline" className="cursor-pointer hover:bg-success/10 text-success border-success/30 text-xs">📊 Recap</Badge>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!days || days.length === 0) && (
          <div className="glass-card rounded-xl p-10 text-center space-y-3 border-2 border-gold/20">
            <Trophy className="w-14 h-14 text-gold mx-auto" />
            <h3 className="text-2xl font-bold">Challenge Starting Soon!</h3>
            <p className="text-muted-foreground">Day 1 kicks off when The Gaffer's ready. Check back for daily updates with proof and results.</p>
          </div>
        )}

        {/* CTA */}
        <div className="glass-card rounded-xl p-6 text-center space-y-3 border border-gold/20">
          <h3 className="text-xl font-bold">Follow The Challenge</h3>
          <p className="text-muted-foreground text-sm">Updated daily with proof screenshots, bet slips, and The Gaffer's commentary.</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/blog">
              <Button variant="outline" className="gap-2">📖 Read the Blog</Button>
            </Link>
            <Link to="/">
              <Button className="gap-2">🎯 Today's Picks</Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
