import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    }

    // When RLS blocks or the row doesn't exist, data will be null.
    const nextProfile = (data as Profile) ?? null;
    setProfile(nextProfile);
    return nextProfile;
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
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
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
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
          setTimeout(() => {
            fetchProfile(newSession.user!.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, discordPseudo: string, language: string) => {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    // Clear local state first to prevent stale data issues
    setUser(null);
    setSession(null);
    setProfile(null);
    
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      // Ignore "User from sub claim in JWT does not exist" errors
      // This happens when the user was deleted but still has a stale JWT
      console.warn('Sign out error (ignored):', error?.message);
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
