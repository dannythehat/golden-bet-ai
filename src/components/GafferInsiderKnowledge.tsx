import { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Brain, Users, Calendar, Activity, Sparkles, CloudRain, Wind, Thermometer } from 'lucide-react';
import theGafferImage from '@/assets/the-gaffer.webp';

interface MatchIntelligence {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  home_injury_count: number;
  away_injury_count: number;
  home_key_players_out: string[];
  away_key_players_out: string[];
  home_injuries_detailed?: { player: string; position: string; reason: string }[];
  away_injuries_detailed?: { player: string; position: string; reason: string }[];
  home_is_fatigued: boolean;
  away_is_fatigued: boolean;
  home_days_since_last_match: number | null;
  away_days_since_last_match: number | null;
  home_matches_last_14_days: number;
  away_matches_last_14_days: number;
  home_new_manager: boolean;
  away_new_manager: boolean;
  home_manager: string | null;
  away_manager: string | null;
  is_early_kickoff: boolean;
  overall_risk_score: number;
  injury_risk_score?: number;
  fatigue_risk_score?: number;
  weather_risk_score?: number;
  should_avoid: boolean;
  gaffer_talking_points: string[];
  intelligence_summary: string;
  rejection_reasons: string[];
  // Weather fields
  weather_temp_celsius?: number | null;
  weather_humidity?: number | null;
  weather_wind_speed_kmh?: number | null;
  weather_rain_chance?: number | null;
  weather_condition?: string | null;
  weather_impact?: string[];
}

interface GafferInsiderKnowledgeProps {
  teamName: string;
  intelligence: MatchIntelligence;
}

export const GafferInsiderKnowledge = forwardRef<HTMLDivElement, GafferInsiderKnowledgeProps>(
  function GafferInsiderKnowledge({ teamName, intelligence }, ref) {
    const [open, setOpen] = useState(false);
  
  const isHomeTeam = intelligence.home_team.toLowerCase().includes(teamName.toLowerCase()) ||
                      teamName.toLowerCase().includes(intelligence.home_team.toLowerCase());
  const opponent = isHomeTeam ? intelligence.away_team : intelligence.home_team;
  const teamInjuries = isHomeTeam ? intelligence.home_injury_count : intelligence.away_injury_count;
  const teamKeyPlayersOut = isHomeTeam ? intelligence.home_key_players_out : intelligence.away_key_players_out;
  const teamInjuriesDetailed = isHomeTeam ? intelligence.home_injuries_detailed : intelligence.away_injuries_detailed;
  const teamIsFatigued = isHomeTeam ? intelligence.home_is_fatigued : intelligence.away_is_fatigued;
  const teamMatchesLast14 = isHomeTeam ? intelligence.home_matches_last_14_days : intelligence.away_matches_last_14_days;
  const teamDaysSinceLast = isHomeTeam ? intelligence.home_days_since_last_match : intelligence.away_days_since_last_match;
  const teamNewManager = isHomeTeam ? intelligence.home_new_manager : intelligence.away_new_manager;
  const teamManager = isHomeTeam ? intelligence.home_manager : intelligence.away_manager;

  // Weather data
  const hasWeather = intelligence.weather_temp_celsius !== null && intelligence.weather_temp_celsius !== undefined;
  const weatherCondition = intelligence.weather_condition;
  const weatherTemp = intelligence.weather_temp_celsius;
  const weatherWind = intelligence.weather_wind_speed_kmh;
  const weatherHumidity = intelligence.weather_humidity;
  const weatherRisk = intelligence.weather_risk_score || 0;
  const weatherImpacts = intelligence.weather_impact || [];

  // Generate Gaffer-style warning message
  const generateGafferMessage = () => {
    const warnings: string[] = [];
    
    if (teamInjuries >= 3) {
      warnings.push(`${teamName} are missing ${teamInjuries} players today`);
    }
    
    // Show detailed injuries if available
    if (teamInjuriesDetailed && teamInjuriesDetailed.length > 0) {
      const detailedList = teamInjuriesDetailed.slice(0, 3)
        .map(i => `${i.player} (${i.position})`)
        .join(', ');
      warnings.push(`Absent: ${detailedList}`);
    } else if (teamKeyPlayersOut && teamKeyPlayersOut.length > 0) {
      warnings.push(`Key absentees: ${teamKeyPlayersOut.slice(0, 3).join(', ')}`);
    }
    
    if (teamIsFatigued) {
      if (teamDaysSinceLast !== null && teamDaysSinceLast <= 3) {
        warnings.push(`Only ${teamDaysSinceLast} days rest since their last match`);
      }
      if (teamMatchesLast14 >= 4) {
        warnings.push(`Fixture congestion - ${teamMatchesLast14} games in 14 days`);
      }
    }
    
    if (teamNewManager && teamManager) {
      warnings.push(`New manager bounce potential with ${teamManager}`);
    }
    
    if (intelligence.is_early_kickoff) {
      warnings.push(`Early kickoff - historically lower scoring`);
    }

    // Weather warnings
    if (weatherImpacts.length > 0) {
      warnings.push(...weatherImpacts.slice(0, 2));
    }
    
    return warnings;
  };
  
  const warnings = generateGafferMessage();
  const hasInsight = warnings.length > 0 || intelligence.gaffer_talking_points?.length > 0;
  
  if (!hasInsight) return null;

  const getRiskColor = (score: number) => {
    if (score >= 60) return 'text-destructive';
    if (score >= 40) return 'text-sky-400';
    return 'text-green-400';
  };

  const getWeatherIcon = () => {
    if (!weatherCondition) return null;
    const condition = weatherCondition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle')) {
      return <CloudRain className="w-4 h-4 text-blue-400" />;
    }
    if (condition.includes('wind') || (weatherWind && weatherWind > 25)) {
      return <Wind className="w-4 h-4 text-muted-foreground" />;
    }
    return <Thermometer className="w-4 h-4 text-orange-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 text-xs bg-neon-yellow/10 hover:bg-neon-yellow/20 border border-neon-yellow/30"
        >
          <Brain className="w-3.5 h-3.5 text-neon-yellow" />
          <span className="hidden sm:inline text-neon-yellow">Insider Intel</span>
          {intelligence.should_avoid && (
            <AlertTriangle className="w-3 h-3 text-destructive" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img 
              src={theGafferImage} 
              alt="The Gaffer" 
              className="w-12 h-12 rounded-full object-cover border-2 border-neon-yellow/40"
            />
            <div>
              <span className="text-neon-yellow font-bold">The Gaffer's Intel</span>
              <p className="text-sm text-muted-foreground font-normal">
                {teamName} vs {opponent}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Risk Score */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Risk Assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${getRiskColor(intelligence.overall_risk_score)}`}>
                {intelligence.overall_risk_score}%
              </span>
              {intelligence.should_avoid && (
                <Badge variant="destructive" className="text-xs">
                  Avoid
                </Badge>
              )}
            </div>
          </div>

          {/* Weather Alert Card */}
          {hasWeather && (
            <div className={`p-3 rounded-lg border ${weatherRisk >= 20 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-card border-border'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getWeatherIcon()}
                  <span className="font-medium text-sm">Weather Conditions</span>
                </div>
                {weatherRisk > 0 && (
                  <Badge variant={weatherRisk >= 25 ? "destructive" : "outline"} className="text-xs">
                    {weatherRisk}% risk
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-background/50">
                  <Thermometer className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-bold">{weatherTemp}°C</div>
                  <div className="text-[10px] text-muted-foreground">Temp</div>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <Wind className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-bold">{weatherWind || 0}</div>
                  <div className="text-[10px] text-muted-foreground">km/h</div>
                </div>
                <div className="p-2 rounded bg-background/50">
                  <CloudRain className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-bold">{weatherHumidity || 0}%</div>
                  <div className="text-[10px] text-muted-foreground">Humidity</div>
                </div>
              </div>
              {weatherCondition && (
                <div className="text-center mt-2 text-sm text-muted-foreground capitalize">
                  {weatherCondition}
                </div>
              )}
              {weatherImpacts.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Betting Impact:</p>
                  <ul className="space-y-0.5">
                    {weatherImpacts.slice(0, 2).map((impact, idx) => (
                      <li key={idx} className="text-xs text-foreground flex items-start gap-1.5">
                        <span className="text-blue-400">•</span>
                        {impact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Gaffer's Warning */}
          {warnings.length > 0 && (
            <div className="p-4 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-neon-yellow shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neon-yellow mb-2">
                    {intelligence.should_avoid 
                      ? "⚠️ Tread carefully, lad..."
                      : "🔍 Worth knowing..."}
                  </p>
                  <ul className="space-y-1.5">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-neon-yellow">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-2xl font-bold text-foreground">{teamInjuries}</div>
              <div className="text-xs text-muted-foreground">Players Out</div>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <div className="text-2xl font-bold text-foreground">
                {teamDaysSinceLast ?? '?'}
              </div>
              <div className="text-xs text-muted-foreground">Days Rest</div>
            </div>
          </div>

          {/* Detailed Injuries */}
          {teamInjuriesDetailed && teamInjuriesDetailed.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-medium text-destructive mb-2">🏥 Missing Players:</p>
              <ul className="space-y-1">
                {teamInjuriesDetailed.slice(0, 5).map((injury, idx) => (
                  <li key={idx} className="text-sm text-foreground flex items-center justify-between">
                    <span>{injury.player}</span>
                    <Badge variant="outline" className="text-[10px]">{injury.position}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Talking Points */}
          {intelligence.gaffer_talking_points && intelligence.gaffer_talking_points.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Match Context:</p>
              <ul className="space-y-1">
                {intelligence.gaffer_talking_points.slice(0, 5).map((point, idx) => (
                  <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary">→</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Kickoff */}
          <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border">
            Kickoff: {new Date(intelligence.kickoff).toLocaleString()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
