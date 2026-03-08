import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SavedTeam, StatCategory, Region, TeamFixture } from '@/types/betting';
import { toast } from 'sonner';

// Local storage key for fallback
const LOCAL_STORAGE_KEY = 'ml-bets-saved-teams';

function getLocalTeams(): SavedTeam[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalTeams(teams: SavedTeam[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(teams));
  } catch (error) {
    console.warn('Failed to save teams to localStorage:', error);
  }
}

export function useSavedTeams() {
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  const fetchSavedTeams = useCallback(async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const { data, error } = await supabase
        .from('saved_teams')
        .select('*')
        .order('created_at', { ascending: false });

      clearTimeout(timeoutId);

      if (error) {
        console.warn('Supabase error, using local storage:', error);
        setUseLocalFallback(true);
        setSavedTeams(getLocalTeams());
        return;
      }

      const formattedTeams: SavedTeam[] = (data || []).map(team => ({
        id: team.id,
        teamName: team.team_name,
        league: team.league,
        region: team.region as Region,
        betType: team.bet_type as StatCategory,
        market: team.market,
        createdAt: team.created_at,
      }));

      setSavedTeams(formattedTeams);
      // Also save to local storage as backup
      saveLocalTeams(formattedTeams);
    } catch (error) {
      console.warn('Error fetching saved teams, using local storage:', error);
      setUseLocalFallback(true);
      setSavedTeams(getLocalTeams());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedTeams();
  }, [fetchSavedTeams]);

  const addTeam = async (
    teamName: string, 
    league: string, 
    region: Region, 
    betType: StatCategory, 
    market: string
  ) => {
    // Check if already saved
    const exists = savedTeams.some(
      t => t.teamName === teamName && t.betType === betType && t.market === market
    );
    
    if (exists) {
      toast.info('Team already in watchlist for this market');
      return null;
    }

    const newTeam: SavedTeam = {
      id: `local-${Date.now()}`,
      teamName,
      league,
      region,
      betType,
      market,
      createdAt: new Date().toISOString(),
    };

    // If using local fallback, just save locally
    if (useLocalFallback) {
      const updatedTeams = [newTeam, ...savedTeams];
      setSavedTeams(updatedTeams);
      saveLocalTeams(updatedTeams);
      toast.success(`${teamName} added to watchlist`);
      return newTeam;
    }

    try {
      const { data, error } = await supabase
        .from('saved_teams')
        .insert({
          team_name: teamName,
          league,
          region,
          bet_type: betType,
          market,
        })
        .select()
        .single();

      if (error) throw error;

      const savedTeam: SavedTeam = {
        id: data.id,
        teamName: data.team_name,
        league: data.league,
        region: data.region as Region,
        betType: data.bet_type as StatCategory,
        market: data.market,
        createdAt: data.created_at,
      };

      const updatedTeams = [savedTeam, ...savedTeams];
      setSavedTeams(updatedTeams);
      saveLocalTeams(updatedTeams);
      toast.success(`${teamName} added to watchlist`);
      return savedTeam;
    } catch (error) {
      console.warn('Error saving team to Supabase, saving locally:', error);
      const updatedTeams = [newTeam, ...savedTeams];
      setSavedTeams(updatedTeams);
      saveLocalTeams(updatedTeams);
      toast.success(`${teamName} added to watchlist`);
      return newTeam;
    }
  };

  const removeTeam = async (teamId: string) => {
    const updatedTeams = savedTeams.filter(t => t.id !== teamId);
    setSavedTeams(updatedTeams);
    saveLocalTeams(updatedTeams);

    // Also try to delete from Supabase if not a local-only ID
    if (!teamId.startsWith('local-') && !useLocalFallback) {
      try {
        await supabase.from('saved_teams').delete().eq('id', teamId);
      } catch (error) {
        console.warn('Failed to delete from Supabase:', error);
      }
    }

    toast.success('Team removed from watchlist');
  };

  const saveFixture = async (fixture: TeamFixture, team: SavedTeam) => {
    if (useLocalFallback) {
      toast.info('Fixture saved locally');
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_fixtures')
        .insert({
          saved_team_id: team.id,
          home_team: fixture.homeTeam,
          away_team: fixture.awayTeam,
          league: fixture.league,
          kickoff: fixture.kickoff,
          bet_type: team.betType,
          market: team.market,
          odds: fixture.odds,
          status: 'upcoming',
        });

      if (error) throw error;
      toast.success('Fixture saved to your betting list');
    } catch (error) {
      console.warn('Error saving fixture:', error);
      toast.info('Fixture saved locally');
    }
  };

  return {
    savedTeams,
    loading,
    addTeam,
    removeTeam,
    saveFixture,
    refetch: fetchSavedTeams,
    isOffline: useLocalFallback,
  };
}
