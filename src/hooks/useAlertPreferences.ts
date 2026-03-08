import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AlertPreference {
  id: string;
  user_id: string;
  saved_fixture_id: string;
  alert_corners: boolean;
  alert_cards: boolean;
  alert_goals: boolean;
  alert_btts: boolean;
  corners_threshold: number | null;
  cards_threshold: number | null;
  goals_threshold: number | null;
  push_enabled: boolean;
  email_enabled: boolean;
  is_active: boolean;
  last_notified_at: string | null;
}

export interface CreateAlertPreference {
  saved_fixture_id: string;
  alert_corners?: boolean;
  alert_cards?: boolean;
  alert_goals?: boolean;
  alert_btts?: boolean;
  corners_threshold?: number | null;
  cards_threshold?: number | null;
  goals_threshold?: number | null;
  push_enabled?: boolean;
  email_enabled?: boolean;
}

// Determines which alerts are relevant based on bet/market type
export const getRelevantAlertsForMarket = (market: string): { 
  corners: boolean; 
  cards: boolean; 
  goals: boolean; 
  btts: boolean;
} => {
  const marketLower = market.toLowerCase();
  
  return {
    corners: marketLower.includes('corner') || marketLower.includes('over_8') || marketLower.includes('over_9') || marketLower.includes('over_10'),
    cards: marketLower.includes('card') || marketLower.includes('booking'),
    goals: marketLower.includes('goal') || marketLower.includes('over_1') || marketLower.includes('over_2') || marketLower.includes('over_3'),
    btts: marketLower.includes('btts') || marketLower.includes('both_teams'),
  };
};

// Extract threshold from market string (e.g., "over_9_5_corners" -> 9.5 -> 10)
export const extractThresholdFromMarket = (market: string): { 
  corners?: number; 
  cards?: number; 
  goals?: number; 
} => {
  const marketLower = market.toLowerCase();
  const thresholds: { corners?: number; cards?: number; goals?: number } = {};
  
  // Corners: over_8_5, over_9_5, over_10_5
  if (marketLower.includes('corner')) {
    const match = marketLower.match(/over_(\d+)_?(\d)?/);
    if (match) {
      const threshold = parseFloat(`${match[1]}.${match[2] || 0}`);
      thresholds.corners = Math.ceil(threshold);
    }
  }
  
  // Cards: over_2_5, over_3_5, over_4_5
  if (marketLower.includes('card')) {
    const match = marketLower.match(/over_(\d+)_?(\d)?/);
    if (match) {
      const threshold = parseFloat(`${match[1]}.${match[2] || 0}`);
      thresholds.cards = Math.ceil(threshold);
    }
  }
  
  // Goals: over_1_5, over_2_5, over_3_5
  if (marketLower.includes('goal') || marketLower.includes('over_2') || marketLower.includes('over_1')) {
    const match = marketLower.match(/over_(\d+)_?(\d)?/);
    if (match) {
      const threshold = parseFloat(`${match[1]}.${match[2] || 0}`);
      thresholds.goals = Math.ceil(threshold);
    }
  }
  
  return thresholds;
};

export function useAlertPreferences() {
  const [preferences, setPreferences] = useState<AlertPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPreferences([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('alert_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setPreferences((data as AlertPreference[]) || []);
    } catch (error) {
      console.error('Error fetching alert preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const createPreference = async (preference: CreateAlertPreference): Promise<AlertPreference | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to set up alerts",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('alert_preferences')
        .upsert({
          user_id: user.id,
          ...preference,
        }, { onConflict: 'user_id,saved_fixture_id' })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "🔔 Alert Set!",
        description: "You'll be notified when your bet is on track",
      });

      await fetchPreferences();
      return data as AlertPreference;
    } catch (error) {
      console.error('Error creating alert preference:', error);
      toast({
        title: "Error",
        description: "Failed to set up alert",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePreference = async (id: string, updates: Partial<CreateAlertPreference>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('alert_preferences')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchPreferences();
      return true;
    } catch (error) {
      console.error('Error updating alert preference:', error);
      return false;
    }
  };

  const deletePreference = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('alert_preferences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Alert Removed",
        description: "You won't receive notifications for this bet",
      });

      await fetchPreferences();
      return true;
    } catch (error) {
      console.error('Error deleting alert preference:', error);
      return false;
    }
  };

  const getPreferenceForFixture = (fixtureId: string): AlertPreference | undefined => {
    return preferences.find(p => p.saved_fixture_id === fixtureId);
  };

  return {
    preferences,
    loading,
    createPreference,
    updatePreference,
    deletePreference,
    getPreferenceForFixture,
    refetch: fetchPreferences,
  };
}
