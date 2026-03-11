import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain, TrendingUp, Target, Zap, AlertTriangle,
  Loader2, Activity, BarChart3, Cpu, Sparkles,
  ArrowUpRight, ArrowDownRight, ChevronRight,
  Trophy, Shield, Layers, Globe, BookOpen, CheckCircle2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell
} from 'recharts';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface ModelAccuracy {
  market: string;
  total_predictions: number;
  correct_predictions: number;
  win_rate: number;
  roi: number;
  profit_loss: number;
  current_streak: number;
  days_tracked: number;
}

interface MLModel {
  market: string;
  model_type: string;
  accuracy: number;
  auc_roc: number;
  training_samples: number;
  features_used: number;
  training_date: string;
  version: number;
}

interface IntelligenceLogEntry {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  ml_probability: number;
  ai_adjusted_probability: number;
  ai_adjustment: number;
  ai_reasoning: string;
  ai_confidence: string;
  created_at: string;
}

interface DailyPL {
  date: string;
  wins: number;
  losses: number;
  net: number;
  roi: number;
}

interface RollingEngineStats {
  total_teams: number;
  full_history: number;
  regions: { region: string; teams: number; avg_o25: number; avg_btts: number; avg_corners: number }[];
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MARKET_LABELS: Record<string, string> = {
  'over_2.5_goals': 'Over 2.5 Goals', 'over_2_5': 'Over 2.5 Goals', 'over_2_5_goals': 'Over 2.5 Goals',
  'over_9.5_corners': 'Over 8.5 Corners', 'over_9_5': 'Over 8.5 Corners', 'over_9_5_corners': 'Over 8.5 Corners',
  'over_3.5_cards': 'Over 3.5 Cards', 'over_3_5': 'Over 3.5 Cards', 'over_3_5_cards': 'Over 3.5 Cards',
};

const MARKET_ICONS: Record<string, typeof Trophy> = {
  'over_2.5_goals': Target, 'over_2_5': Target, 'over_2_5_goals': Target,
  'over_9.5_corners': TrendingUp, 'over_9_5': TrendingUp, 'over_9_5_corners': TrendingUp,
  'over_3.5_cards': AlertTriangle, 'over_3_5': AlertTriangle, 'over_3_5_cards': AlertTriangle,
};

const MARKET_COLORS: Record<string, string> = {
  'over_2.5_goals': 'hsl(var(--primary))', 'over_2_5': 'hsl(var(--primary))', 'over_2_5_goals': 'hsl(var(--primary))',
  'over_9.5_corners': '#06b6d4', 'over_9_5': '#06b6d4', 'over_9_5_corners': '#06b6d4',
  'over_3.5_cards': '#ef4444', 'over_3_5': '#ef4444', 'over_3_5_cards': '#ef4444',
};

const REGION_FLAGS: Record<string, string> = {
  uk: '🇬🇧', european: '🇪🇺', americas: '🌎', asia: '🌏', africa: '🌍'
};

// How The Gaffer works — steps
const HOW_IT_WORKS = [
  {
    step: '01', icon: Database2, title: 'Data Ingestion',
    desc: 'Every day The Gaffer pulls live fixtures, team stats, referee data, and injury reports from multiple data sources — building a rich picture of every match.',
    tags: ['Team Form L10', 'xG Data', 'Referee Bias', 'Injury Reports'],
  },
  {
    step: '02', icon: Cpu, title: 'ML Probability Engine',
    desc: 'Three trained Gradient Boosted models each specialise in a different market — Goals, Corners, Cards. They analyse 40+ features per fixture and output a raw probability.',
    tags: ['Over 2.5 Goals', 'Over 8.5 Corners', 'Over 3.5 Cards'],
  },
  {
    step: '03', icon: Sparkles, title: 'AI Intelligence Layer',
    desc: 'Gemini AI reads the ML output alongside qualitative context — new manager, derby tension, adverse weather — and can nudge the probability ±10% to account for things numbers alone can\'t capture.',
    tags: ['±10% Adjustment Cap', 'Context Factors', 'Gemini AI', 'Transparent Logs'],
  },
  {
    step: '04', icon: Shield, title: 'Value Edge Filter',
    desc: 'Only bets with a statistical edge over bookmaker odds pass through. Minimum odds 1.33, minimum edge 5%. No edge = no bet.',
    tags: ['>5% Edge Required', 'Min Odds 1.33', 'No Real Odds = Skip', 'ROI Tracked'],
  },
  {
    step: '05', icon: Trophy, title: 'The Gaffer Picks',
    desc: 'The highest-confidence selections become today\'s Golden Bets, Bet Builder, and ACCA — each with a full breakdown so you understand exactly why it was chosen.',
    tags: ['Golden Bets', 'Bet Builder', 'ACCA', 'Full Reasoning'],
  },
];

// Placeholder icon (Database not available named that way)
function Database2(props: any) { return <BarChart3 {...props} />; }

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export function MLHubSection() {
  const [activeTab, setActiveTab] = useState('how');
  const [modelAccuracy, setModelAccuracy] = useState<ModelAccuracy[]>([]);
  const [mlModels, setMLModels] = useState<MLModel[]>([]);
  const [intelligenceLog, setIntelligenceLog] = useState<IntelligenceLogEntry[]>([]);
  const [rollingEngine, setRollingEngine] = useState<RollingEngineStats | null>(null);
  const [dailyPL, setDailyPL] = useState<DailyPL[]>([]);
  const [trainingCounts, setTrainingCounts] = useState({ v2: 0, sportmonks: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        accuracyRes, modelsRes, rollingRes, intelRes,
        v2CountRes, smCountRes, plRes,
      ] = await Promise.all([
        supabase.from('ml_model_accuracy').select('*').order('date', { ascending: false }),
        supabase.from('ml_models').select('market,model_type,accuracy,auc_roc,training_samples,features_used,training_date,version').eq('is_active', true).order('training_date', { ascending: false }),
        supabase.from('team_rolling_stats').select('region, matches_used, over_25_goals_pct, btts_pct, over_95_corners_pct'),
        supabase.from('ml_intelligence_log').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }),
        supabase.from('sportmonks_matches').select('*', { count: 'exact', head: true }),
        supabase.from('pl_summary').select('prediction_date,wins,losses,net_profit,roi').order('prediction_date', { ascending: false }).limit(30),
      ]);

      // Aggregate accuracy per market
      const agg: Record<string, ModelAccuracy> = {};
      const datesByMarket: Record<string, Set<string>> = {};
      accuracyRes.data?.forEach(row => {
        if (!agg[row.market]) {
          agg[row.market] = { market: row.market, total_predictions: 0, correct_predictions: 0, win_rate: 0, roi: 0, profit_loss: 0, current_streak: row.current_streak || 0, days_tracked: 0 };
          datesByMarket[row.market] = new Set();
        }
        agg[row.market].total_predictions += row.total_predictions || 0;
        agg[row.market].correct_predictions += row.correct_predictions || 0;
        agg[row.market].profit_loss += Number(row.profit_loss) || 0;
        datesByMarket[row.market].add(row.date);
      });
      Object.entries(agg).forEach(([market, m]) => {
        m.win_rate = m.total_predictions > 0 ? Math.round((m.correct_predictions / m.total_predictions) * 100) : 0;
        m.roi = m.total_predictions > 0 ? Math.round((m.profit_loss / (m.total_predictions * 10)) * 100) : 0;
        m.days_tracked = datesByMarket[market]?.size || 0;
      });
      setModelAccuracy(Object.values(agg));

      setMLModels((modelsRes.data || []).map((m: any) => ({
        market: m.market, model_type: m.model_type, accuracy: Number(m.accuracy),
        auc_roc: Number(m.auc_roc), training_samples: m.training_samples,
        features_used: m.features_used, training_date: m.training_date, version: m.version,
      })));

      setIntelligenceLog((intelRes.data || []) as IntelligenceLogEntry[]);

      // Rolling engine
      const rollingData = rollingRes.data || [];
      const regionMap: Record<string, { teams: number; o25Sum: number; bttsSum: number; cornersSum: number; count: number }> = {};
      let totalTeams = 0, fullHistory = 0;
      rollingData.forEach((r: any) => {
        const region = r.region || 'Unknown';
        if (!regionMap[region]) regionMap[region] = { teams: 0, o25Sum: 0, bttsSum: 0, cornersSum: 0, count: 0 };
        regionMap[region].teams++; regionMap[region].o25Sum += Number(r.over_25_goals_pct) || 0;
        regionMap[region].bttsSum += Number(r.btts_pct) || 0; regionMap[region].cornersSum += Number(r.over_95_corners_pct) || 0;
        regionMap[region].count++; totalTeams++;
        if (r.matches_used >= 10) fullHistory++;
      });
      setRollingEngine({
        total_teams: totalTeams, full_history: fullHistory,
        regions: Object.entries(regionMap).filter(([r]) => r !== 'Unknown')
          .map(([region, data]) => ({ region, teams: data.teams, avg_o25: Math.round(data.o25Sum / data.count), avg_btts: Math.round(data.bttsSum / data.count), avg_corners: Math.round(data.cornersSum / data.count) }))
          .sort((a, b) => b.teams - a.teams),
      });

      setTrainingCounts({ v2: v2CountRes.count || 0, sportmonks: smCountRes.count || 0 });

      // Daily P&L
      const pl = (plRes.data || []).reverse().map((row: any) => ({
        date: new Date(row.prediction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        wins: row.wins || 0,
        losses: row.losses || 0,
        net: Number(row.net_profit) || 0,
        roi: Number(row.roi) || 0,
      }));
      setDailyPL(pl);

    } catch (err) { console.error('Gaffer Intel fetch error:', err); }
    finally { setIsLoading(false); }
  };

  const activeModels = mlModels.length;
  const bestAUC = mlModels.length > 0 ? Math.max(...mlModels.map(m => m.auc_roc)) : 0;
  const totalDataPoints = trainingCounts.v2 + trainingCounts.sportmonks;
  const overallWinRate = modelAccuracy.length > 0
    ? Math.round(modelAccuracy.reduce((s, m) => s + m.win_rate, 0) / modelAccuracy.length) : 0;
  const totalPL = dailyPL.reduce((s, d) => s + d.net, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading Gaffer Intel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="oracle-card sparkle-bg">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">🧠 Gaffer Intel</h2>
              <p className="text-muted-foreground text-sm">How The Gaffer thinks • What the models know • Where the edge comes from</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HeroStat icon={BarChart3} label="Training Records" value={(totalDataPoints).toLocaleString()} sub="Matches fed into the models" color="text-primary" />
        <HeroStat icon={Globe} label="Teams Tracked" value={(rollingEngine?.total_teams || 0).toLocaleString()} sub={`${rollingEngine?.full_history || 0} with full L10 history`} color="text-primary" />
        <HeroStat icon={Cpu} label="Active Models" value={activeModels > 0 ? activeModels.toString() : '4'} sub={bestAUC > 0 ? `Best AUC: ${(bestAUC * 100).toFixed(1)}%` : '4 markets covered'} color="text-primary" />
        <HeroStat icon={Activity} label="Avg Win Rate" value={overallWinRate > 0 ? `${overallWinRate}%` : '—'} sub={totalPL !== 0 ? `£${totalPL.toFixed(0)} cumulative P&L` : 'Live tracking'} color={overallWinRate >= 55 ? 'text-success' : 'text-primary'} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="how" className="text-xs"><BookOpen className="w-3.5 h-3.5 mr-1 hidden md:inline" />How It Works</TabsTrigger>
          <TabsTrigger value="models" className="text-xs"><Cpu className="w-3.5 h-3.5 mr-1 hidden md:inline" />Model Stats</TabsTrigger>
          <TabsTrigger value="pl" className="text-xs"><TrendingUp className="w-3.5 h-3.5 mr-1 hidden md:inline" />Daily P&L</TabsTrigger>
          <TabsTrigger value="intelligence" className="text-xs"><Sparkles className="w-3.5 h-3.5 mr-1 hidden md:inline" />AI Decisions</TabsTrigger>
        </TabsList>

        {/* ── HOW IT WORKS ── */}
        <TabsContent value="how" className="space-y-4 mt-4">
          <div className="text-center mb-2">
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
              The Gaffer is an end-to-end AI betting intelligence system. Here's exactly how it goes from raw data to a confident pick — no black boxes.
            </p>
          </div>

          <div className="space-y-3">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc, tags }) => (
              <Card key={step} className="glass-card-hover border-l-4 border-l-primary/50">
                <CardContent className="py-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-primary/60 font-bold tracking-widest">STEP {step}</span>
                        <h3 className="font-bold text-sm">{title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{desc}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] border-primary/30 text-primary/80">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Formula explainer */}
          <Card className="glass-card border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-primary" />The Selection Formula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
                <FormulaBlock pct="40%" label="Overall L10 Form" color="bg-primary/20 border-primary/30" />
                <FormulaBlock pct="30%" label="Venue-Specific Form" color="bg-amber-500/10 border-amber-500/30" />
                <FormulaBlock pct="20%" label="H2H History" color="bg-cyan-500/10 border-cyan-500/30" />
                <FormulaBlock pct="10%" label="Derby / Context" color="bg-rose-500/10 border-rose-500/30" />
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                These weights blend into a base probability → AI refines it → value edge filter → pick selected
              </p>
            </CardContent>
          </Card>

          {/* Data coverage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DataCoverageCard icon="⚽" label="Match Records" value={(totalDataPoints).toLocaleString()} desc="Training data fed into the models" />
            <DataCoverageCard icon="🌍" label="Leagues Covered" value="90+" desc="From Premier League to lower tiers" />
            <DataCoverageCard icon="📅" label="Years of Data" value="2010–2026" desc="Historical patterns power predictions" />
          </div>
        </TabsContent>

        {/* ── MODEL STATS ── */}
        <TabsContent value="models" className="space-y-4 mt-4">
          {mlModels.length === 0 && modelAccuracy.length === 0 ? (
            <EmptyState icon={Cpu} title="Models Warming Up" description="Model stats will appear here after the first training cycle completes." />
          ) : (
            <>
              {/* AUC / Accuracy cards */}
              <div className="grid gap-4 md:grid-cols-2">
                {(['over_2.5_goals', 'btts', 'over_9.5_corners', 'over_3.5_cards'] as const).map(market => {
                  const model = mlModels.find(m => m.market === market || m.market === market.replace(/\./g, '_'));
                  const accuracy = modelAccuracy.find(m => m.market === market || m.market === market.replace(/\./g, '_'));
                  const Icon = MARKET_ICONS[market] || Target;
                  const label = MARKET_LABELS[market];
                  const color = MARKET_COLORS[market];
                  const auc = model ? (model.auc_roc * 100) : null;
                  const winRate = accuracy?.win_rate ?? null;

                  return (
                    <Card key={market} className="glass-card-hover">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" style={{ color }} />
                            <span className="font-semibold text-sm">{label}</span>
                          </div>
                          {model && (
                            <Badge variant="outline" className="text-[10px]">v{model.version}</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <ModelMetric label="AUC Score" value={auc !== null ? `${auc.toFixed(1)}%` : '—'} good={auc !== null && auc >= 60} desc="How well it ranks outcomes" />
                          <ModelMetric label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} good={winRate !== null && winRate >= 55} desc="Bets that hit the mark" />
                          {model && <ModelMetric label="Train Size" value={model.training_samples.toLocaleString()} desc="Records used in training" />}
                          {model && <ModelMetric label="Features" value={model.features_used.toString()} desc="Data signals analysed" />}
                        </div>

                        {auc !== null && (
                          <div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>AUC confidence band</span>
                              <span className={auc >= 65 ? 'text-success' : auc >= 55 ? 'text-amber-500' : 'text-muted-foreground'}>
                                {auc >= 65 ? '🟢 Strong' : auc >= 55 ? '🟡 Solid' : '🔵 Building'}
                              </span>
                            </div>
                            <Progress value={Math.min(auc, 80)} max={80} className="h-1.5" style={{ '--progress-color': color } as any} />
                          </div>
                        )}
                        {accuracy && accuracy.total_predictions > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {accuracy.correct_predictions}/{accuracy.total_predictions} correct • {accuracy.days_tracked} days tracked •{' '}
                            <span className={accuracy.profit_loss >= 0 ? 'text-success' : 'text-destructive'}>
                              {accuracy.profit_loss >= 0 ? '+' : ''}£{accuracy.profit_loss.toFixed(2)} P&L
                            </span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Accuracy bar chart */}
              {modelAccuracy.length > 0 && (
                <Card className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Win Rate by Market</CardTitle>
                    <CardDescription className="text-xs">Live accuracy from settled bets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={modelAccuracy.map(m => ({ name: MARKET_LABELS[m.market]?.split(' ').slice(-2).join(' ') || m.market, rate: m.win_rate, color: MARKET_COLORS[m.market] || 'hsl(var(--primary))' }))} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                          <Tooltip formatter={(val: any) => [`${val}%`, 'Win Rate']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                            {modelAccuracy.map((m, i) => (
                              <Cell key={i} fill={MARKET_COLORS[m.market] || 'hsl(var(--primary))'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data coverage */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" />Coverage & Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rollingEngine?.regions.map(r => (
                      <div key={r.region} className="flex items-center gap-3">
                        <span className="text-lg w-6">{REGION_FLAGS[r.region] || '🌐'}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="capitalize font-medium">{r.region}</span>
                            <span className="text-muted-foreground">{r.teams} teams • O2.5 avg: {r.avg_o25}%</span>
                          </div>
                          <Progress value={Math.min(r.teams / 5, 100)} className="h-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── DAILY P&L ── */}
        <TabsContent value="pl" className="space-y-4 mt-4">
          {dailyPL.length === 0 ? (
            <EmptyState icon={TrendingUp} title="P&L Tracking Coming" description="Daily profit & loss will be charted here as bets are settled each evening." />
          ) : (
            <>
              {/* Cumulative P&L line chart */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Cumulative P&L Trend</CardTitle>
                  <CardDescription className="text-xs">Running total across all markets — last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(() => {
                        let running = 0;
                        return dailyPL.map(d => { running += d.net; return { ...d, cumulative: Number(running.toFixed(2)) }; });
                      })()}>
                        <defs>
                          <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `£${v}`} />
                        <Tooltip formatter={(val: any) => [`£${Number(val).toFixed(2)}`, 'Cumulative P&L']} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                        <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#plGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily wins/losses bar */}
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Daily Results</CardTitle>
                  <CardDescription className="text-xs">Wins vs losses per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyPL} barSize={14} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="wins" name="Wins" fill="hsl(var(--success, 142 71% 45%))" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="losses" name="Losses" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryTile label="Total P&L" value={`${totalPL >= 0 ? '+' : ''}£${totalPL.toFixed(2)}`} positive={totalPL >= 0} />
                <SummaryTile label="Total Wins" value={dailyPL.reduce((s, d) => s + d.wins, 0).toString()} positive={true} />
                <SummaryTile label="Total Losses" value={dailyPL.reduce((s, d) => s + d.losses, 0).toString()} positive={false} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ── AI DECISIONS ── */}
        <TabsContent value="intelligence" className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              Every time The Gaffer generates picks, the AI reads the ML model's raw probability and decides whether to adjust it based on context. This log shows every single decision — with the reasoning — so you can see exactly how the final probabilities are reached.
            </p>
          </div>

          {intelligenceLog.length === 0 ? (
            <EmptyState icon={Sparkles} title="AI Decisions Building Up" description="Intelligence log entries appear here as The Gaffer runs each day. Check back after picks are generated." />
          ) : (
            <div className="space-y-2">
              {intelligenceLog.map((entry) => {
                const adjPositive = entry.ai_adjustment > 0;
                const adjAbs = Math.abs(entry.ai_adjustment * 100);
                const noChange = adjAbs < 0.5;
                return (
                  <Card key={entry.id} className="glass-card-hover">
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{entry.home_team} vs {entry.away_team}</p>
                          <p className="text-[10px] text-muted-foreground">{entry.league}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-[10px]">{MARKET_LABELS[entry.market] || entry.market}</Badge>
                          <Badge className={`text-[10px] ${entry.ai_confidence === 'high' ? 'bg-success/20 text-success border-success/30' : entry.ai_confidence === 'medium' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-muted text-muted-foreground'}`}>
                            {entry.ai_confidence || 'low'} confidence
                          </Badge>
                        </div>
                      </div>

                      {/* Probability flow */}
                      <div className="flex items-center gap-2 text-xs mb-2 bg-muted/30 rounded-lg p-2">
                        <div className="text-center">
                          <p className="text-muted-foreground text-[10px]">ML Model</p>
                          <p className="font-mono font-bold">{(entry.ml_probability * 100).toFixed(1)}%</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="text-center px-2 py-0.5 rounded bg-card">
                          <p className="text-[10px] text-muted-foreground">AI Adjustment</p>
                          {noChange ? (
                            <p className="font-mono text-muted-foreground">No change</p>
                          ) : (
                            <p className={`font-mono font-bold ${adjPositive ? 'text-success' : 'text-destructive'}`}>
                              {adjPositive ? '+' : '-'}{adjAbs.toFixed(1)}%
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Final Prob</p>
                          <p className="font-mono font-bold text-primary">{(entry.ai_adjusted_probability * 100).toFixed(1)}%</p>
                        </div>
                        <div className="ml-auto">
                          {noChange ? null : adjPositive
                            ? <ArrowUpRight className="w-4 h-4 text-success" />
                            : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                        </div>
                      </div>

                      {entry.ai_reasoning && (
                        <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                          "{entry.ai_reasoning}"
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(entry.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
function HeroStat({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="stat-card text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-foreground/80 mt-0.5">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function ModelMetric({ label, value, desc, good }: { label: string; value: string; desc: string; good?: boolean }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-mono font-bold text-sm ${good === true ? 'text-success' : good === false ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground/70">{desc}</p>
    </div>
  );
}

function FormulaBlock({ pct, label, color }: { pct: string; label: string; color: string }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-xl font-bold">{pct}</p>
      <p className="text-muted-foreground text-[10px] mt-0.5">{label}</p>
    </div>
  );
}

function DataCoverageCard({ icon, label, value, desc }: { icon: string; label: string; value: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card/50 text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs font-medium text-foreground/80">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

function SummaryTile({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="p-3 rounded-xl border border-border/50 bg-card/50 text-center">
      <p className={`text-xl font-bold ${positive ? 'text-success' : 'text-destructive'}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}
