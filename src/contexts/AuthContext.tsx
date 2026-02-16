import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import log from '@/lib/logger';
import type { User, Session } from '@supabase/supabase-js';

let supabaseModulePromise: Promise<typeof import('@/integrations/supabase/client')> | null = null;

const loadSupabase = () => {
  if (!supabaseModulePromise) {
    supabaseModulePromise = import('@/integrations/supabase/client');
  }
  return supabaseModulePromise;
};

const scheduleIdle = (cb: () => void) => {
  const win = window as Window & {
    requestIdleCallback?: (callback: () => void) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.requestIdleCallback === 'function') {
    return win.requestIdleCallback(cb);
  }

  return window.setTimeout(cb, 0);
};

const cancelIdle = (handle: number) => {
  const win = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof win.cancelIdleCallback === 'function') {
    win.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
};

interface Profile {
  id: string;
  username: string;
  battletag: string | null;
  main_character_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  battlenet_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, discordPseudo: string, language: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { supabase } = await loadSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      log.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    }

    // When RLS blocks or the row doesn't exist, data will be null.
    const nextProfile = (data as Profile) ?? null;
    setProfile(nextProfile);
    return nextProfile;
  };

  // Background sync of Battle.net data on login (non-blocking)
  const triggerBattleNetSync = async (accessToken: string) => {
    try {
      const { supabase } = await loadSupabase();
      // Fire and forget - don't block the UI
      supabase.functions.invoke('battlenet-auth/resync', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {},
      }).then(({ error }) => {
        if (error) {
          log.debug('Background Battle.net sync skipped:', error.message);
        } else {
          log.debug('Background Battle.net sync completed');
        }
      });
    } catch (err) {
      log.debug('Background sync error:', err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      const { supabase } = await loadSupabase();

      // Fetch initial session and profile once; this avoids UI "flicker" where pages
      // render with user!=null but profile==null for a moment.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      if (!cancelled) setLoading(false);

      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          // Only update state if there's an actual change
          setSession((prev) => {
            if (prev?.access_token === newSession?.access_token) return prev;
            return newSession;
          });

          setUser((prev) => {
            if (prev?.id === newSession?.user?.id) return prev;
            return newSession?.user ?? null;
          });

          // Defer profile fetch to avoid edge-case deadlocks
          if (newSession?.user) {
            setTimeout(async () => {
              const profileData = await fetchProfile(newSession.user!.id);

              // Trigger background sync on SIGNED_IN event if Battle.net is linked
              if (event === 'SIGNED_IN' && profileData?.battlenet_id && newSession.access_token) {
                triggerBattleNetSync(newSession.access_token);
              }
            }, 0);
          } else {
            setProfile(null);
          }
        },
      );

      subscription = authSubscription;
    };

    const idleHandle = scheduleIdle(() => {
      init();
    });

    return () => {
      cancelled = true;
      cancelIdle(idleHandle);
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, discordPseudo: string, language: string) => {
    const { supabase } = await loadSupabase();
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: discordPseudo,
          preferred_language: language,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { supabase } = await loadSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    const { supabase } = await loadSupabase();
    // Clear local state first to prevent stale data issues
    setUser(null);
    setSession(null);
    setProfile(null);
    
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      log.warn('Sign out error (ignored):', error?.message);
    }
    
    // Clear any stored session data to ensure clean state
    localStorage.removeItem('supabase.auth.token');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
