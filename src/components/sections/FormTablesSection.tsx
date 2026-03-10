/**
 * Form Tables Section - Uses pre-cached Supabase data
 * Displays top 20 teams by region for goals, corners, cards, BTTS
 */

import { useState } from 'react';
import { getLeagueFlag } from '@/lib/countryFlags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Target, Flag, CreditCard, Swords, TrendingUp, TrendingDown, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useFormStats } from '@/hooks/useFormStats';
import { regions } from '@/data/formTablesData';
import { Region, StatCategory } from '@/types/betting';

type StatType = 'overs' | 'unders';

interface FormTablesSectionProps {
  onAddTeam?: (teamName: string, league: string, region: Region, betType: StatCategory, market: string) => void;
}

export function FormTablesSection({ onAddTeam }: FormTablesSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region>('all');
  const [statType, setStatType] = useState<StatType>('overs');

  // Fetch real stats from Supabase cache
  const { goalStats, cornerStats, cardStats, bttsStats, isLoading, isError, refetch } = useFormStats(selectedRegion);

  const getPercentageColor = (value: number) => {
    if (value >= 75) return 'text-green-400';
    if (value >= 60) return 'text-primary';
    if (value >= 45) return 'text-sky-400';
    return 'text-red-400';
  };

  const handleTeamClick = (team: string, league: string, region: Region, betType: StatCategory, market: string) => {
    if (onAddTeam) {
      onAddTeam(team, league, region, betType, market);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading Statistics</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Fetching cached data from database...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <Card className="glass-card border-red-500/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10">
              <div className="text-red-500 mb-4">⚠️</div>
              <h3 className="text-xl font-semibold mb-2">Error Loading Statistics</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Failed to fetch data. Please try again.
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-primary">Form Tables</h2>
          <p className="text-muted-foreground">Team statistics for goals, corners, cards & BTTS markets</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Refresh Button */}
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

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

      <p className="text-sm text-muted-foreground">💡 Click on a team to save it for tracking</p>

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
                <Badge variant="secondary" className="ml-auto">{goalStats.length} Teams</Badge>
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
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          No data available. The bootstrap process may still be running.
                        </TableCell>
                      </TableRow>
                    ) : (
                      goalStats.map((team, index) => (
                        <TableRow 
                          key={team.id} 
                          className="cursor-pointer hover:bg-primary/5"
                          onClick={() => handleTeamClick(team.team, team.league, team.region, 'goals', statType === 'overs' ? 'O2.5' : 'U2.5')}
                        >
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{team.team}</TableCell>
                          <TableCell className="text-muted-foreground text-sm"><span className="mr-1">{getLeagueFlag(team.league)}</span>{team.league}</TableCell>
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
                          <TableCell><Plus className="w-4 h-4 text-muted-foreground" /></TableCell>
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
                <Badge variant="secondary" className="ml-auto">{cornerStats.length} Teams</Badge>
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
                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                          No data available. The bootstrap process may still be running.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cornerStats.map((team, index) => (
                        <TableRow 
                          key={team.id}
                          className="cursor-pointer hover:bg-primary/5"
                          onClick={() => handleTeamClick(team.team, team.league, team.region, 'corners', statType === 'overs' ? 'O9.5' : 'U9.5')}
                        >
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{team.team}</TableCell>
                          <TableCell className="text-muted-foreground text-sm"><span className="mr-1">{getLeagueFlag(team.league)}</span>{team.league}</TableCell>
                          <TableCell className="text-center">{team.played}</TableCell>
                          <TableCell className="text-center text-primary font-medium">{team.avgCorners}</TableCell>
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
                          <TableCell><Plus className="w-4 h-4 text-muted-foreground" /></TableCell>
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
                <Badge variant="secondary" className="ml-auto">{cardStats.length} Teams</Badge>
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
                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                          No data available. The bootstrap process may still be running.
                        </TableCell>
                      </TableRow>
                    ) : (
                      cardStats.map((team, index) => (
                        <TableRow 
                          key={team.id}
                          className="cursor-pointer hover:bg-primary/5"
                          onClick={() => handleTeamClick(team.team, team.league, team.region, 'cards', statType === 'overs' ? 'O3.5' : 'U3.5')}
                        >
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{team.team}</TableCell>
                          <TableCell className="text-muted-foreground text-sm"><span className="mr-1">{getLeagueFlag(team.league)}</span>{team.league}</TableCell>
                          <TableCell className="text-center">{team.played}</TableCell>
                          <TableCell className="text-center text-primary font-medium">{team.avgCards}</TableCell>
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
                          <TableCell><Plus className="w-4 h-4 text-muted-foreground" /></TableCell>
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
                <Badge variant="secondary" className="ml-auto">{bttsStats.length} Teams</Badge>
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
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                          <TableCell><Plus className="w-4 h-4 text-muted-foreground" /></TableCell>
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
    </div>
  );
}
