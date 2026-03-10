import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmailPreference {
  id: string;
  user_id: string;
  new_bets_enabled: boolean;
  settlement_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useEmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data as EmailPreference | null);
    } catch (error) {
      console.error('Error fetching email preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: {
    new_bets_enabled?: boolean;
    settlement_enabled?: boolean;
  }): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to manage email preferences",
          variant: "destructive",
        });
        return false;
      }

      if (preferences) {
        // Update existing
        const { error } = await supabase
          .from('email_preferences')
          .update(updates)
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('email_preferences')
          .insert({
            user_id: user.id,
            ...updates,
          });

        if (error) throw error;
      }

      toast({
        title: "Preferences saved",
        description: "Your email preferences have been updated",
      });

      await fetchPreferences();
      return true;
    } catch (error) {
      console.error('Error updating email preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
      return false;
    }
  };

  const enableAllAlerts = async (): Promise<boolean> => {
    return updatePreferences({
      new_bets_enabled: true,
      settlement_enabled: true,
    });
  };

  return {
    preferences,
    loading,
    updatePreferences,
    enableAllAlerts,
    refetch: fetchPreferences,
  };
}
