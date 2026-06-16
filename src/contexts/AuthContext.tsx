import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import type { User, Session } from '@supabase/supabase-js';

import {
  clearAdminImpersonationTransition,
  clearStoredAdminImpersonationState,
  consumeAdminImpersonationTransition,
  readStoredAdminImpersonationState,
  setAdminImpersonationTransition,
  writeStoredAdminImpersonationState,
  type ImpersonationTargetSummary,
  type StoredAdminImpersonationState,
} from '@/lib/adminImpersonation';
import log from '@/lib/logger';
import { trackProductEvent } from '@/lib/productEvents';

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
  isImpersonating: boolean;
  impersonationTarget: ImpersonationTargetSummary | null;
  signUp: (email: string, password: string, discordPseudo: string, language: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  startImpersonation: (targetUser: ImpersonationTargetSummary, startPath?: string) => Promise<void>;
  restoreAdminSession: (restorePath?: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonationState, setImpersonationState] = useState<StoredAdminImpersonationState | null>(() =>
    readStoredAdminImpersonationState(),
  );

  const syncImpersonationState = () => {
    const nextState = readStoredAdminImpersonationState();
    setImpersonationState(nextState);
    return nextState;
  };

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

  const shouldSuppressSignedInEffects = () =>
    Boolean(readStoredAdminImpersonationState());

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
              const authTransition = consumeAdminImpersonationTransition();
              const suppressSignedInEffects = Boolean(authTransition) || shouldSuppressSignedInEffects();
              syncImpersonationState();

              // Trigger background sync on SIGNED_IN event if Battle.net is linked
              if (event === 'SIGNED_IN' && !suppressSignedInEffects && profileData?.battlenet_id && newSession.access_token) {
                triggerBattleNetSync(newSession.access_token);
              }

              if (event === 'SIGNED_IN' && !suppressSignedInEffects) {
                const { supabase } = await loadSupabase();
                await trackProductEvent(supabase, 'first_login', {
                  source: 'auth_context',
                  featureArea: 'auth',
                });
              }
            }, 0);
          } else {
            setProfile(null);
            setImpersonationState(null);
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
    setImpersonationState(null);
    clearStoredAdminImpersonationState();
    clearAdminImpersonationTransition();
    
    try {
      await supabase.auth.signOut();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      log.warn('Sign out error (ignored):', message);
    }
    
    // Clear any stored session data to ensure clean state
    localStorage.removeItem('supabase.auth.token');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const startImpersonation = async (
    targetUser: ImpersonationTargetSummary,
    startPath = '/admin?section=users',
  ) => {
    const { supabase } = await loadSupabase();
    const adminSession = session;

    if (!adminSession?.access_token || !adminSession.refresh_token) {
      throw new Error('Missing admin session');
    }

    const { data, error } = await supabase.functions.invoke('admin-impersonation/start', {
      headers: { Authorization: `Bearer ${adminSession.access_token}` },
      body: {
        targetUserId: targetUser.id,
        startPath,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.verifyToken || !data?.impersonationId) {
      throw new Error('Invalid impersonation response');
    }

    const nextState: StoredAdminImpersonationState = {
      adminSession,
      impersonationId: data.impersonationId as string,
      returnPath: startPath,
      target: {
        id: data.target?.id || targetUser.id,
        username: data.target?.username ?? targetUser.username ?? null,
      },
    };

    writeStoredAdminImpersonationState(nextState);
    setImpersonationState(nextState);
    setAdminImpersonationTransition('start');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.verifyToken as string,
      type: (data.tokenType || 'magiclink') as
        | 'signup'
        | 'magiclink'
        | 'recovery'
        | 'invite'
        | 'email'
        | 'email_change',
    });

    if (verifyError) {
      clearStoredAdminImpersonationState();
      clearAdminImpersonationTransition();
      setImpersonationState(null);
      throw verifyError;
    }
  };

  const restoreAdminSession = async (restorePath?: string) => {
    const { supabase } = await loadSupabase();
    const storedState = readStoredAdminImpersonationState();

    if (!storedState) {
      throw new Error('No admin impersonation state found');
    }

    const nextRestorePath = restorePath || storedState.returnPath || '/admin?section=users';
    setAdminImpersonationTransition('restore');

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: storedState.adminSession.access_token,
      refresh_token: storedState.adminSession.refresh_token,
    });

    if (setSessionError) {
      clearAdminImpersonationTransition();
      throw setSessionError;
    }

    const { error: restoreError } = await supabase.functions.invoke('admin-impersonation/restore', {
      headers: { Authorization: `Bearer ${storedState.adminSession.access_token}` },
      body: {
        impersonationId: storedState.impersonationId,
        restorePath: nextRestorePath,
      },
    });

    clearStoredAdminImpersonationState();
    setImpersonationState(null);

    if (restoreError) {
      throw restoreError;
    }

    return nextRestorePath;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isImpersonating: Boolean(impersonationState),
      impersonationTarget: impersonationState?.target ?? null,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      startImpersonation,
      restoreAdminSession,
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
