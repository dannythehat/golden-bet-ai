import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Sparkles, Target, Flag, CreditCard, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { goalFormStats, cornerFormStats, cardFormStats } from '@/data/formTablesData';

interface TeamAnalysis {
  team: string;
  league: string;
  goalStats: typeof goalFormStats[0] | null;
  cornerStats: typeof cornerFormStats[0] | null;
  cardStats: typeof cardFormStats[0] | null;
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  bestMarkets: string[];
}

export function StatsCheckerSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsAnalyzing(true);

    // Simulate AI analysis delay
    setTimeout(() => {
      const goalData = goalFormStats.find(
        (t) => t.team.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const cornerData = cornerFormStats.find(
        (t) => t.team.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const cardData = cardFormStats.find(
        (t) => t.team.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (goalData || cornerData || cardData) {
        const recommendations: string[] = [];
        const bestMarkets: string[] = [];

        if (goalData) {
          if (goalData.over_2_5 >= 70) {
            recommendations.push(`Strong Over 2.5 Goals candidate with ${goalData.over_2_5}% hit rate`);
            bestMarkets.push('Over 2.5 Goals');
          }
          if (goalData.over_1_5 >= 80) {
            recommendations.push(`Very reliable for Over 1.5 Goals at ${goalData.over_1_5}%`);
            bestMarkets.push('Over 1.5 Goals');
          }
          if (goalData.under_2_5 >= 50) {
            recommendations.push(`Consider Under 2.5 in defensive matchups (${goalData.under_2_5}%)`);
          }
        }

        if (cornerData) {
          if (cornerData.over_9_5 >= 55) {
            recommendations.push(`Good Over 9.5 Corners option with ${cornerData.over_9_5}% success`);
            bestMarkets.push('Over 9.5 Corners');
          }
          if (cornerData.avgCorners >= 10) {
            recommendations.push(`High corner average of ${cornerData.avgCorners} per game`);
          }
        }

        if (cardData) {
          if (cardData.over_3_5 >= 60) {
            recommendations.push(`Cards magnet - Over 3.5 Cards hits ${cardData.over_3_5}% of games`);
            bestMarkets.push('Over 3.5 Cards');
          }
        }

        const riskLevel = bestMarkets.length >= 2 ? 'low' : bestMarkets.length === 1 ? 'medium' : 'high';

        setAnalysis({
          team: goalData?.team || cornerData?.team || cardData?.team || searchQuery,
          league: goalData?.league || cornerData?.league || cardData?.league || 'Unknown',
          goalStats: goalData || null,
          cornerStats: cornerData || null,
          cardStats: cardData || null,
          recommendations: recommendations.length > 0 ? recommendations : ['No strong betting patterns identified for this team'],
          riskLevel,
          bestMarkets,
        });
      } else {
        setAnalysis({
          team: searchQuery,
          league: 'Not Found',
          goalStats: null,
          cornerStats: null,
          cardStats: null,
          recommendations: ['Team not found in database. Try searching for a major European team.'],
          riskLevel: 'high',
          bestMarkets: [],
        });
      }

      setIsAnalyzing(false);
    }, 1500);
  };

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Low Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Medium Risk</Badge>;
      case 'high':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High Risk</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold gold-text flex items-center gap-2">
          <Sparkles className="w-8 h-8" />
          AI Stats Checker
        </h2>
        <p className="text-muted-foreground">AI-powered team analysis for smarter betting decisions</p>
      </div>

      {/* Search Card */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Team Analysis
          </CardTitle>
          <CardDescription>
            Search for any team to get AI-powered betting insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search team name... (e.g., Manchester City)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-background/50"
              />
            </div>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Market Focus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                <SelectItem value="goals">Goals Only</SelectItem>
                <SelectItem value="corners">Corners Only</SelectItem>
                <SelectItem value="cards">Cards Only</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="gold" 
              onClick={handleSearch}
              disabled={isAnalyzing}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {/* Quick Search Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Quick search:</span>
            {['Manchester City', 'Bayern Munich', 'Barcelona', 'Atletico Madrid'].map((team) => (
              <Badge 
                key={team}
                variant="outline" 
                className="cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => {
                  setSearchQuery(team);
                  setTimeout(() => handleSearch(), 100);
                }}
              >
                {team}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Team Overview */}
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{analysis.team}</CardTitle>
                  <CardDescription>{analysis.league}</CardDescription>
                </div>
                {getRiskBadge(analysis.riskLevel)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Best Markets */}
              {analysis.bestMarkets.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Best Markets</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.bestMarkets.map((market) => (
                      <Badge key={market} variant="gold" className="gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {market}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Insights
                </h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Stats Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Goals Stats */}
            {analysis.goalStats && (
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Goals Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O1.5:</span>
                      <span className="font-medium">{analysis.goalStats.over_1_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O2.5:</span>
                      <span className="font-medium">{analysis.goalStats.over_2_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O3.5:</span>
                      <span className="font-medium">{analysis.goalStats.over_3_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Games:</span>
                      <span className="font-medium">{analysis.goalStats.played}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Corners Stats */}
            {analysis.cornerStats && (
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flag className="w-4 h-4 text-primary" />
                    Corners Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg:</span>
                      <span className="font-medium text-primary">{analysis.cornerStats.avgCorners}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O9.5:</span>
                      <span className="font-medium">{analysis.cornerStats.over_9_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O10.5:</span>
                      <span className="font-medium">{analysis.cornerStats.over_10_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Games:</span>
                      <span className="font-medium">{analysis.cornerStats.played}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cards Stats */}
            {analysis.cardStats && (
              <Card className="glass-card border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Cards Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg:</span>
                      <span className="font-medium text-primary">{analysis.cardStats.avgCards}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O3.5:</span>
                      <span className="font-medium">{analysis.cardStats.over_3_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">O4.5:</span>
                      <span className="font-medium">{analysis.cardStats.over_4_5}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Games:</span>
                      <span className="font-medium">{analysis.cardStats.played}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analysis && (
        <Card className="glass-card border-border/50 border-dashed">
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Team Selected</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Search for a team above to get AI-powered betting insights, statistical analysis, and market recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
