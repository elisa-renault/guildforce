import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SanctionType = 'timeout' | 'ban';

export interface ForumSanction {
  id: string;
  user_id: string;
  sanction_type: SanctionType;
  reason: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
  profiles?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  created_by_profile?: {
    id: string;
    username: string;
  };
}

export interface ActiveSanction {
  sanction_type: SanctionType;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}

// Hook to check if the current user is sanctioned
export function useCurrentUserSanction() {
  const { user } = useAuth();
  const [sanction, setSanction] = useState<ActiveSanction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSanction(null);
      setLoading(false);
      return;
    }

    const checkSanction = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_forum_sanction', { p_user_id: user.id });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          setSanction(data[0] as ActiveSanction);
        } else {
          setSanction(null);
        }
      } catch (error) {
        console.error('Error checking sanction:', error);
        setSanction(null);
      } finally {
        setLoading(false);
      }
    };

    checkSanction();
  }, [user]);

  return { sanction, loading, isSanctioned: !!sanction };
}

// Hook for managing sanctions (for moderators/admins)
export function useForumSanctionActions() {
  const { user } = useAuth();

  const applySanction = useCallback(async (
    userId: string,
    sanctionType: SanctionType,
    reason?: string,
    durationHours?: number
  ) => {
    if (!user) throw new Error('Not authenticated');

    const expiresAt = durationHours 
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('forum_user_sanctions')
      .insert({
        user_id: userId,
        sanction_type: sanctionType,
        reason: reason || null,
        expires_at: expiresAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, [user]);

  const revokeSanction = useCallback(async (sanctionId: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('forum_user_sanctions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq('id', sanctionId);

    if (error) throw error;
  }, [user]);

  const fetchActiveSanctions = useCallback(async () => {
    const { data, error } = await supabase
      .from('forum_user_sanctions')
      .select('*')
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Fetch profiles separately to avoid relationship ambiguity
    const userIds = [...new Set(data.flatMap(s => [s.user_id, s.created_by]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return data.map(s => ({
      ...s,
      profiles: profileMap.get(s.user_id),
      created_by_profile: profileMap.get(s.created_by),
    })) as ForumSanction[];
  }, []);

  const fetchAllSanctions = useCallback(async () => {
    const { data, error } = await supabase
      .from('forum_user_sanctions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    
    // Fetch profiles separately to avoid relationship ambiguity
    const userIds = [...new Set(data.flatMap(s => [s.user_id, s.created_by]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    return data.map(s => ({
      ...s,
      profiles: profileMap.get(s.user_id),
      created_by_profile: profileMap.get(s.created_by),
    })) as ForumSanction[];
  }, []);

  return {
    applySanction,
    revokeSanction,
    fetchActiveSanctions,
    fetchAllSanctions,
  };
}
