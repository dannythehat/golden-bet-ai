/**
 * Live Form Tables Section - Region-based filtering
 * Uses pre-cached Supabase data - NO live API calls
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Flag, CreditCard, Swords, TrendingUp, TrendingDown, Plus, Loader2, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFormStats } from '@/hooks/useFormStats';
import { regions } from '@/data/formTablesData';
import { Region, StatCategory } from '@/types/betting';

type StatType = 'overs' | 'unders';

interface LiveFormTablesSectionProps {
  onAddTeam?: (teamName: string, league: string, region: Region, betType: StatCategory, market: string) => void;
}

export function LiveFormTablesSection({ onAddTeam }: LiveFormTablesSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region>('all');
  const [statType, setStatType] = useState<StatType>('overs');

  // Fetch ALL aggregated stats (cached at 4am daily)
  const { goalStats, cornerStats, cardStats, bttsStats, isLoading, isError } = useFormStats(selectedRegion);

  const getPercentageColor = (value: number) => {
    if (value >= 75) return 'text-green-400';
    if (value >= 60) return 'text-gold';
    if (value >= 45) return 'text-orange-400';
    return 'text-red-400';
  };

  const handleTeamClick = (team: string, league: string, region: Region, betType: StatCategory, market: string) => {
    if (onAddTeam) {
      onAddTeam(team, league, region, betType, market);
    }
  };

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load statistics. Please try again in a few minutes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold gold-text">Live Form Tables</h2>
          <p className="text-muted-foreground">Region-based statistics • Updated daily at 4:00 AM UTC</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Region Filter */}
          <div className="flex rounded-lg overflow-hidden border border-border/50">
            {regions.map((region) => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  selectedRegion === region.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card hover:bg-muted'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>

          {/* Overs/Unders Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border/50">
            <button
              onClick={() => setStatType('overs')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                statType === 'overs' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Overs
            </button>
            <button
              onClick={() => setStatType('unders')}
              className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                statType === 'unders' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
              }`}
            >
              <TrendingDown className="w-4 h-4" /> Unders
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          💡 Showing top 20 teams across <strong>{selectedRegion === 'all' ? 'ALL regions' : regions.find(r => r.id === selectedRegion)?.label}</strong>. 
          Click any team to save for tracking. Data refreshes daily at 4:00 AM UTC.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <Card className="glass-card border-border/50">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-medium">Loading statistics...</p>
                <p className="text-sm text-muted-foreground">Fetching data from database</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tabs for different markets */}
          <Tabs defaultValue="goals" className="w-full">
            <TabsList className="grid w-full grid-cols-4 glass-card">
              <TabsTrigger value="goals" className="gap-2">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Goals</span>
              </TabsTrigger>
              <TabsTrigger value="corners" className="gap-2">
                <Flag className="w-4 h-4" />
                <span className="hidden sm:inline">Corners</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="btts" className="gap-2">
                <Swords className="w-4 h-4" />
                <span className="hidden sm:inline">BTTS</span>
              </TabsTrigger>
            </TabsList>

            {/* Goals Table */}
            <TabsContent value="goals">
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Goals Form Table
                    <Badge variant="outline" className="ml-2">{statType === 'overs' ? 'Over Markets' : 'Under Markets'}</Badge>
                    <Badge variant="secondary" className="ml-auto">{goalStats.length} teams</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>League</TableHead>
                          <TableHead className="text-center">P</TableHead>
                          {statType === 'overs' ? (
                            <>
                              <TableHead className="text-center">O1.5</TableHead>
                              <TableHead className="text-center">O2.5</TableHead>
                              <TableHead className="text-center">O3.5</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="text-center">U1.5</TableHead>
                              <TableHead className="text-center">U2.5</TableHead>
                              <TableHead className="text-center">U3.5</TableHead>
                            </>
                          )}
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No data available. The bootstrap process may still be running.
                            </TableCell>
                          </TableRow>
                        ) : (
                          goalStats.map((team, index) => (
                            <TableRow 
                              key={team.id} 
                              className="cursor-pointer hover:bg-gold/5"
                              onClick={() => handleTeamClick(team.team, team.league, team.region, 'goals', statType === 'overs' ? 'O2.5' : 'U2.5')}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{team.team}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{team.league}</TableCell>
                              <TableCell className="text-center">{team.played}</TableCell>
                              {statType === 'overs' ? (
                                <>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_1_5)}`}>{team.over_1_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_2_5)}`}>{team.over_2_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_3_5)}`}>{team.over_3_5}%</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_1_5)}`}>{team.under_1_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_2_5)}`}>{team.under_2_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_3_5)}`}>{team.under_3_5}%</TableCell>
                                </>
                              )}
                              <TableCell>
                                <button className="p-1 hover:bg-primary/10 rounded">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Corners Table */}
            <TabsContent value="corners">
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flag className="w-5 h-5 text-primary" />
                    Corners Form Table
                    <Badge variant="outline" className="ml-2">{statType === 'overs' ? 'Over Markets' : 'Under Markets'}</Badge>
                    <Badge variant="secondary" className="ml-auto">{cornerStats.length} teams</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>League</TableHead>
                          <TableHead className="text-center">P</TableHead>
                          <TableHead className="text-center">Avg</TableHead>
                          {statType === 'overs' ? (
                            <>
                              <TableHead className="text-center">O8.5</TableHead>
                              <TableHead className="text-center">O9.5</TableHead>
                              <TableHead className="text-center">O10.5</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="text-center">U8.5</TableHead>
                              <TableHead className="text-center">U9.5</TableHead>
                              <TableHead className="text-center">U10.5</TableHead>
                            </>
                          )}
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cornerStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No data available. The bootstrap process may still be running.
                            </TableCell>
                          </TableRow>
                        ) : (
                          cornerStats.map((team, index) => (
                            <TableRow 
                              key={team.id} 
                              className="cursor-pointer hover:bg-gold/5"
                              onClick={() => handleTeamClick(team.team, team.league, team.region, 'corners', statType === 'overs' ? 'O9.5' : 'U9.5')}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{team.team}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{team.league}</TableCell>
                              <TableCell className="text-center">{team.played}</TableCell>
                              <TableCell className="text-center font-medium text-primary">{team.avgCorners}</TableCell>
                              {statType === 'overs' ? (
                                <>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_8_5)}`}>{team.over_8_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_9_5)}`}>{team.over_9_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_10_5)}`}>{team.over_10_5}%</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_8_5)}`}>{team.under_8_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_9_5)}`}>{team.under_9_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_10_5)}`}>{team.under_10_5}%</TableCell>
                                </>
                              )}
                              <TableCell>
                                <button className="p-1 hover:bg-primary/10 rounded">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cards Table */}
            <TabsContent value="cards">
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Cards Form Table
                    <Badge variant="outline" className="ml-2">{statType === 'overs' ? 'Over Markets' : 'Under Markets'}</Badge>
                    <Badge variant="secondary" className="ml-auto">{cardStats.length} teams</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>League</TableHead>
                          <TableHead className="text-center">P</TableHead>
                          <TableHead className="text-center">Avg</TableHead>
                          {statType === 'overs' ? (
                            <>
                              <TableHead className="text-center">O2.5</TableHead>
                              <TableHead className="text-center">O3.5</TableHead>
                              <TableHead className="text-center">O4.5</TableHead>
                            </>
                          ) : (
                            <>
                              <TableHead className="text-center">U2.5</TableHead>
                              <TableHead className="text-center">U3.5</TableHead>
                              <TableHead className="text-center">U4.5</TableHead>
                            </>
                          )}
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cardStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No data available. The bootstrap process may still be running.
                            </TableCell>
                          </TableRow>
                        ) : (
                          cardStats.map((team, index) => (
                            <TableRow 
                              key={team.id} 
                              className="cursor-pointer hover:bg-gold/5"
                              onClick={() => handleTeamClick(team.team, team.league, team.region, 'cards', statType === 'overs' ? 'O3.5' : 'U3.5')}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{team.team}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{team.league}</TableCell>
                              <TableCell className="text-center">{team.played}</TableCell>
                              <TableCell className="text-center font-medium text-primary">{team.avgCards}</TableCell>
                              {statType === 'overs' ? (
                                <>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_2_5)}`}>{team.over_2_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_3_5)}`}>{team.over_3_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.over_4_5)}`}>{team.over_4_5}%</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_2_5)}`}>{team.under_2_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_3_5)}`}>{team.under_3_5}%</TableCell>
                                  <TableCell className={`text-center font-medium ${getPercentageColor(team.under_4_5)}`}>{team.under_4_5}%</TableCell>
                                </>
                              )}
                              <TableCell>
                                <button className="p-1 hover:bg-primary/10 rounded">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BTTS Table */}
            <TabsContent value="btts">
              <Card className="glass-card border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-primary" />
                    Both Teams to Score Form Table
                    <Badge variant="secondary" className="ml-auto">{bttsStats.length} teams</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>League</TableHead>
                          <TableHead className="text-center">P</TableHead>
                          <TableHead className="text-center">BTTS Yes</TableHead>
                          <TableHead className="text-center">BTTS No</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bttsStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No data available. The bootstrap process may still be running.
                            </TableCell>
                          </TableRow>
                        ) : (
                          bttsStats.map((team, index) => (
                            <TableRow 
                              key={team.id} 
                              className="cursor-pointer hover:bg-gold/5"
                              onClick={() => handleTeamClick(team.team, team.league, team.region, 'btts', 'Yes')}
                            >
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{team.team}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">{team.league}</TableCell>
                              <TableCell className="text-center">{team.played}</TableCell>
                              <TableCell className={`text-center font-medium ${getPercentageColor(team.btts_yes)}`}>{team.btts_yes}%</TableCell>
                              <TableCell className={`text-center font-medium ${getPercentageColor(team.btts_no)}`}>{team.btts_no}%</TableCell>
                              <TableCell>
                                <button className="p-1 hover:bg-primary/10 rounded">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
