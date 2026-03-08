import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return { error };
      }

      // Notify admin of new signup (fire and forget)
      supabase.functions.invoke('notify-new-signup', {
        body: { email, signedUpAt: new Date().toISOString() }
      }).catch(err => console.log('Signup notification skipped:', err));

      toast({
        title: "Welcome to Footy Oracle! ⚽",
        description: "Your account has been created successfully.",
      });
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Sign up failed",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  }, [toast]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back! ⚽",
        description: "You're now signed in.",
      });
      
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Sign in failed",
        description: err.message,
        variant: "destructive",
      });
      return { error: err };
    }
  }, [toast]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "Come back soon!",
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [toast]);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!session,
  };
}
