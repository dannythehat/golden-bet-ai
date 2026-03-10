import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function StatsLegend() {
  return (
    <Card className="glass-card border-border/50 bg-muted/30">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">📊 Understanding the Statistics:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
              <div><span className="font-medium text-foreground">P</span> = Games Played</div>
              <div><span className="font-medium text-foreground">Avg</span> = Average per game</div>
              <div><span className="font-medium text-foreground">O2.5</span> = Over 2.5 (3+ goals/cards)</div>
              <div><span className="font-medium text-foreground">U2.5</span> = Under 2.5 (0-2 goals/cards)</div>
              <div><span className="font-medium text-foreground">O9.5</span> = Over 9.5 corners (10+ corners)</div>
              <div><span className="font-medium text-foreground">U9.5</span> = Under 9.5 corners (0-9 corners)</div>
            </div>
            <p className="text-xs pt-1">
              <span className="text-green-400 font-medium">●</span> 75%+ = Very High | 
              <span className="text-primary font-medium"> ●</span> 60-74% = High | 
              <span className="text-sky-400 font-medium"> ●</span> 45-59% = Medium | 
              <span className="text-red-400 font-medium"> ●</span> &lt;45% = Low
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
