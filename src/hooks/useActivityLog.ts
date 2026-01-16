import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ActionType = 
  | 'wish_validation'
  | 'wish_created'
  | 'wish_updated'
  | 'wish_deleted'
  | 'member_joined'
  | 'commitment_changed'
  | 'roster_created'
  | 'roster_updated'
  | 'roster_deleted'
  | 'permissions_updated';

export interface ActivityLog {
  id: string;
  guild_id: string;
  user_id: string | null;
  action_type: ActionType;
  action_details: Record<string, unknown>;
  target_user_id: string | null;
  roster_id: string | null;
  created_at: string;
  // Joined data
  user_profile?: {
    username: string;
    avatar_url: string | null;
    battletag: string | null;
  };
  target_user_profile?: {
    username: string;
    avatar_url: string | null;
    battletag: string | null;
  };
  roster?: {
    name: string;
  };
}

interface UseActivityLogOptions {
  guildId: string;
  limit?: number;
  actionTypes?: ActionType[];
  page?: number;
}

export const useActivityLog = ({ guildId, limit = 50, actionTypes, page = 1 }: UseActivityLogOptions) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!guildId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Get total count first
      let countQuery = supabase
        .from('guild_activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId);

      if (actionTypes && actionTypes.length > 0) {
        countQuery = countQuery.in('action_type', actionTypes);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      let query = supabase
        .from('guild_activity_logs')
        .select(`
          id,
          guild_id,
          user_id,
          action_type,
          action_details,
          target_user_id,
          roster_id,
          created_at
        `)
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (actionTypes && actionTypes.length > 0) {
        query = query.in('action_type', actionTypes);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;

      // Fetch related profiles and rosters
      const userIds = new Set<string>();
      const rosterIds = new Set<string>();

      logsData?.forEach(log => {
        if (log.user_id) userIds.add(log.user_id);
        if (log.target_user_id) userIds.add(log.target_user_id);
        if (log.roster_id) rosterIds.add(log.roster_id);
      });

      // Fetch profiles
      const profilesMap = new Map<string, { username: string; avatar_url: string | null; battletag: string | null }>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, battletag')
          .in('id', Array.from(userIds));
        
        profiles?.forEach(p => {
          profilesMap.set(p.id, { username: p.username, avatar_url: p.avatar_url, battletag: p.battletag });
        });
      }

      // Fetch rosters
      const rostersMap = new Map<string, { name: string }>();
      if (rosterIds.size > 0) {
        const { data: rosters } = await supabase
          .from('rosters')
          .select('id, name')
          .in('id', Array.from(rosterIds));
        
        rosters?.forEach(r => {
          rostersMap.set(r.id, { name: r.name });
        });
      }

      // Combine data
      const enrichedLogs: ActivityLog[] = (logsData || []).map(log => ({
        ...log,
        action_type: log.action_type as ActionType,
        action_details: log.action_details as Record<string, unknown>,
        user_profile: log.user_id ? profilesMap.get(log.user_id) : undefined,
        target_user_profile: log.target_user_id ? profilesMap.get(log.target_user_id) : undefined,
        roster: log.roster_id ? rostersMap.get(log.roster_id) : undefined,
      }));

      setLogs(enrichedLogs);
      setHasMore((count || 0) > page * limit);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [guildId, limit, actionTypes, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / limit);

  return { logs, loading, error, refetch: fetchLogs, totalCount, totalPages, hasMore };
};
