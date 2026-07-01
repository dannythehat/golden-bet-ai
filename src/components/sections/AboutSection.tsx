import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Flag, CreditCard, Swords, Trophy, Brain, Sparkles, Clock, TrendingUp } from 'lucide-react';
import theGafferImage from '@/assets/the-gaffer.png';
import { OracleCrest } from '@/components/homepage/primitives';

export function AboutSection() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">About The Footy Oracle</span>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          Your Edge in <span className="text-primary">Football Betting</span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Data-driven insights. AI-powered analysis. No gut feelings — just cold, calculated edge.
        </p>
      </div>

      {/* Who We Are */}
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative mx-auto grid aspect-square w-full max-w-md place-items-center rounded-2xl border-2 border-primary/30 bg-[#07000f] p-10 shadow-2xl">
            <OracleCrest className="h-full w-full" />
          </div>
        </div>
        
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Who We Are</h2>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <p>
              <span className="text-foreground font-semibold">The Footy Oracle</span> isn't your typical tipster service. 
              We've built something different — an AI system trained on over a decade of football data, 
              crunching numbers across <span className="text-primary font-semibold">200+ leagues worldwide</span>.
            </p>
            <p>
              Founded by football fanatics and data scientists, we set out to create a betting tool 
              that removes emotion from the equation. The result? A system that spots value the bookies miss.
            </p>
            <p>
              Every pick is backed by real data — form analysis, head-to-head records, 
              statistical trends, and market movements. No hunches, no favourites, just numbers.
            </p>
          </div>
        </div>
      </div>

      {/* The Gaffer */}
      <Card className="oracle-card border-primary/30 overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Intelligence</span>
              </div>
              
              <h2 className="text-3xl font-bold">Meet The Gaffer</h2>
              
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p>
                  The Gaffer is our AI betting analyst with the tactical brain of a seasoned football manager.
                  Trained on <span className="text-primary font-semibold">15+ years of match data</span> from 
                  leagues spanning Europe, South America, Asia, and beyond.
                </p>
                <p>
                  He analyses form, identifies patterns, and delivers picks like a true gaffer — 
                  straight-talking, data-driven, and always looking for that edge.
                </p>
              </div>

              <blockquote className="border-l-4 border-primary/50 pl-4 italic text-foreground/90">
                "Right lads, I've been through the numbers and I've spotted the value. 
                No messing about — these are the picks that make the bookies nervous."
              </blockquote>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse-glow" />
              <img 
                src={theGafferImage} 
                alt="The Gaffer - AI Betting Intelligence" 
                className="relative w-full max-w-sm mx-auto rounded-2xl border-2 border-primary/40 shadow-2xl"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg">
                <Brain className="w-4 h-4 inline mr-2" />
                AI CORE v2.0
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What We Cover */}
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">What We Cover</h2>
          <p className="text-muted-foreground mt-2">Four markets, thousands of data points</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card-hover border-border/50 text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Goals</h3>
              <p className="text-sm text-muted-foreground">
                Over/Under 2.5 goals analysis based on team scoring patterns and defensive records
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover border-border/50 text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <Flag className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Corners</h3>
              <p className="text-sm text-muted-foreground">
                Over 8.5 corners tracking with attacking style and match tempo analysis
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover border-border/50 text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Cards</h3>
              <p className="text-sm text-muted-foreground">
                Over 3.5 cards predictions using referee tendencies and team discipline data
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card-hover border-border/50 text-center">
            <CardContent className="pt-8 pb-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <Swords className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg">BTTS</h3>
              <p className="text-sm text-muted-foreground">
                Both Teams To Score analysis combining offensive and defensive metrics
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-6">
        <Card className="oracle-card border-primary/30 text-center">
          <CardContent className="py-8">
            <p className="text-5xl font-extrabold text-primary">200+</p>
            <p className="text-muted-foreground mt-2">Leagues Covered</p>
          </CardContent>
        </Card>
        
        <Card className="oracle-card border-primary/30 text-center">
          <CardContent className="py-8">
            <p className="text-5xl font-extrabold text-primary">15+</p>
            <p className="text-muted-foreground mt-2">Years of Data</p>
          </CardContent>
        </Card>
        
        <Card className="oracle-card border-primary/30 text-center">
          <CardContent className="py-8">
            <p className="text-5xl font-extrabold text-primary">1M+</p>
            <p className="text-muted-foreground mt-2">Matches Analysed</p>
          </CardContent>
        </Card>
      </div>

      {/* Our Approach */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-8 md:p-12 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Our Approach</h2>
            <p className="text-muted-foreground mt-2">How The Gaffer finds value</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Data Collection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We aggregate data from every major league — Premier League, La Liga, Serie A, 
                Bundesliga, and 66 more. Updated daily with live fixture stats.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">AI Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Gaffer processes form patterns, head-to-head records, and statistical trends 
                to calculate true probabilities for each market.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-bold text-lg">Value Detection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We compare our probabilities against bookmaker odds to find genuine value edges — 
                only picks with positive expected value make the cut.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="py-6 px-8">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-semibold text-foreground">Responsible Gambling:</span>{' '}
            The Footy Oracle provides data-driven insights for entertainment purposes. 
            Betting involves risk. Please gamble responsibly and never bet more than you can afford to lose. 
            If you need support, visit <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">BeGambleAware.org</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
