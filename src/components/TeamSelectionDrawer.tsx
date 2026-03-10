import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Calendar, Bookmark, ChevronUp, Trash2 } from 'lucide-react';
import { SavedTeam, TeamFixture, StatCategory, Region } from '@/types/betting';
import { mockFixtures } from '@/data/formTablesData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TeamSelectionDrawerProps {
  savedTeams: SavedTeam[];
  onRemoveTeam: (teamId: string) => void;
  onSaveFixture: (fixture: TeamFixture, team: SavedTeam) => void;
}

export function TeamSelectionDrawer({ savedTeams, onRemoveTeam, onSaveFixture }: TeamSelectionDrawerProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const selectedTeam = savedTeams.find(t => t.id === selectedTeamId);

  // Get fixtures for selected team
  const teamFixtures = selectedTeam 
    ? mockFixtures.filter(f => 
        f.homeTeam === selectedTeam.teamName || f.awayTeam === selectedTeam.teamName
      )
    : [];

  const handleRemoveTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('saved_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      onRemoveTeam(teamId);
      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
      toast.success('Team removed from watchlist');
    } catch (error) {
      console.error('Error removing team:', error);
      toast.error('Failed to remove team');
    }
  };

  const getBetTypeLabel = (betType: StatCategory) => {
    const labels: Record<StatCategory, string> = {
      goals: 'Goals',
      corners: 'Corners',
      cards: 'Cards',
      btts: 'BTTS',
    };
    return labels[betType];
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="gold" 
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 gap-2 shadow-lg"
          disabled={savedTeams.length === 0}
        >
          <Bookmark className="w-4 h-4" />
          Saved Teams ({savedTeams.length})
          <ChevronUp className="w-4 h-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50">
          <DrawerTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-gold" />
            Saved Teams
            <Badge variant="secondary" className="ml-2">{savedTeams.length} teams</Badge>
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="p-4 grid md:grid-cols-2 gap-4 max-h-[60vh] overflow-hidden">
          {/* Saved Teams List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Saved Teams</h3>
            <ScrollArea className="h-[45vh]">
              <div className="space-y-2 pr-4">
                {savedTeams.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Click on teams in the Form Tables to add them to your watchlist
                  </p>
                ) : (
                  savedTeams.map((team) => (
                    <Card 
                      key={team.id} 
                      className={`glass-card cursor-pointer transition-all ${
                        selectedTeamId === team.id ? 'border-gold/50 golden-glow' : 'border-border/50 hover:border-gold/30'
                      }`}
                      onClick={() => setSelectedTeamId(team.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{team.teamName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{team.league}</Badge>
                              <Badge variant="market" className="text-xs">{getBetTypeLabel(team.betType)}</Badge>
                              <span className="text-xs text-muted-foreground">{team.market}</span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTeam(team.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Fixtures for Selected Team */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {selectedTeam ? `Upcoming Fixtures - ${selectedTeam.teamName}` : 'Select a Team'}
            </h3>
            <ScrollArea className="h-[45vh]">
              <div className="space-y-2 pr-4">
                {!selectedTeam ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Select a team to see upcoming fixtures
                  </p>
                ) : teamFixtures.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No upcoming fixtures found
                  </p>
                ) : (
                  teamFixtures.map((fixture) => (
                    <Card key={fixture.id} className="glass-card border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {fixture.homeTeam} vs {fixture.awayTeam}
                            </p>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(fixture.kickoff), 'MMM d, yyyy HH:mm')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{fixture.league}</Badge>
                              {fixture.odds ? (
                                <span className="text-xs text-gold font-medium">@ {fixture.odds}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Odds TBA</span>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs"
                            onClick={() => onSaveFixture(fixture, selectedTeam)}
                          >
                            Save Bet
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}