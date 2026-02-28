import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatRankLabel } from '@/lib/rankLabel';

export type PermissionType = 
  | 'manage_wishes' 
  | 'manage_polls' 
  | 'manage_rosters' 
  | 'view_activity_log'
  | 'manage_vault'
  | 'view_vault_audit';

export interface PermissionRule {
  id?: string;
  permission_type: PermissionType;
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

export interface GuildMember {
  user_id: string;
  username: string;
}

export interface GuildRank {
  rank_index: number;
  rank_name: string;
}

export function useGuildPermissions(guildId: string | null) {
  const [permissions, setPermissions] = useState<PermissionRule[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);
  const [officerRankThreshold, setOfficerRankThreshold] = useState<number>(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { rankLabels } = useGuildRankLabels({ guildId });
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });

  const loadData = useCallback(async () => {
    if (!guildId) return;
    
    setLoading(true);
    
    try {
      // Load permissions
      const { data: permissionsData, error: permError } = await supabase
        .from('guild_permissions')
        .select('*')
        .eq('guild_id', guildId);

      if (permError) throw permError;

      setPermissions(
        (permissionsData || []).map(p => ({
          id: p.id,
          permission_type: p.permission_type as PermissionType,
          access_type: p.access_type as 'user' | 'rank',
          user_id: p.user_id ?? undefined,
          min_rank_index: p.min_rank_index ?? undefined,
          max_rank_index: p.max_rank_index ?? undefined,
        }))
      );

      // Load guild members
      const { data: membersData } = await supabase
        .from('guild_members')
        .select('user_id')
        .eq('guild_id', guildId);

      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        const membersWithNames: GuildMember[] = membersData.map(m => ({
          user_id: m.user_id,
          username: profilesData?.find(p => p.id === m.user_id)?.username || 'Unknown',
        }));
        setMembers(membersWithNames);
      }

      // Load guild ranks
      const { data: guildData } = await supabase
        .from('guilds')
        .select('name, server, region, officer_rank_threshold')
        .eq('id', guildId)
        .single();

      if (guildData) {
        setOfficerRankThreshold(guildData.officer_rank_threshold ?? 2);
        const { data: ranksData } = await supabase
          .from('wow_guild_memberships')
          .select('rank_index, rank_name')
          .ilike('guild_name', guildData.name)
          .ilike('guild_realm_slug', guildData.server)
          .ilike('guild_region', guildData.region);

        if (ranksData) {
          const uniqueRanks = new Map<number, string>();
          ranksData.forEach(r => {
            if (!uniqueRanks.has(r.rank_index)) {
              const normalizedLabel = formatRankLabel({
                rankName: r.rank_name,
                rankIndex: r.rank_index,
                rankLabel,
                guildMasterLabel: t.guild.rank0,
                customLabel: rankLabels[r.rank_index],
              });
              uniqueRanks.set(r.rank_index, normalizedLabel);
            }
          });

          const ranksArray: GuildRank[] = Array.from(uniqueRanks.entries())
            .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
            .sort((a, b) => a.rank_index - b.rank_index);
          
          setRanks(ranksArray);
        }
      }
    } catch {
      toast({
        title: t.errors.generic,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [guildId, rankLabel, rankLabels, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savePermissions = async (newPermissions: PermissionRule[]) => {
    if (!guildId) return;
    
    setSaving(true);

    // Capture old permissions for logging
    const oldPermissions = [...permissions];

    try {
      // Delete all existing permissions for this guild
      const { error: deleteError } = await supabase
        .from('guild_permissions')
        .delete()
        .eq('guild_id', guildId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (newPermissions.length > 0) {
        const toInsert = newPermissions.map(p => ({
          guild_id: guildId,
          permission_type: p.permission_type,
          access_type: p.access_type,
          user_id: p.access_type === 'user' ? p.user_id : null,
          min_rank_index: p.access_type === 'rank' ? (p.min_rank_index ?? 0) : null,
          max_rank_index: p.access_type === 'rank' ? p.max_rank_index : null,
        }));

        const { error: insertError } = await supabase
          .from('guild_permissions')
          .insert(toInsert);

        if (insertError) throw insertError;
      }

      // Log activity
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      
      if (userId) {
        // Build a summary of changes
        const changes: Record<string, { added: number; removed: number; modified: number }> = {};
        
        const permissionTypes = [
          'manage_wishes',
          'manage_polls',
          'manage_rosters',
          'view_activity_log',
          'manage_vault',
          'view_vault_audit',
        ] as const;
        
        permissionTypes.forEach(type => {
          const oldRules = oldPermissions.filter(p => p.permission_type === type);
          const newRules = newPermissions.filter(p => p.permission_type === type);
          
          const oldCount = oldRules.length;
          const newCount = newRules.length;
          
          if (oldCount !== newCount || JSON.stringify(oldRules) !== JSON.stringify(newRules)) {
            changes[type] = {
              added: Math.max(0, newCount - oldCount),
              removed: Math.max(0, oldCount - newCount),
              modified: Math.min(oldCount, newCount) > 0 ? 1 : 0,
            };
          }
        });

        if (Object.keys(changes).length > 0) {
          await supabase.rpc('log_guild_activity', {
            p_guild_id: guildId,
            p_user_id: userId,
            p_action_type: 'permissions_updated',
            p_action_details: {
              changes,
              total_rules: newPermissions.length,
            },
          });
        }
      }

      setPermissions(newPermissions);
      toast({ title: t.common.save });
    } catch {
      toast({
        title: t.errors.generic,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionRules = (permissionType: PermissionType): PermissionRule[] => {
    return permissions.filter(p => p.permission_type === permissionType);
  };

  const updatePermissionRules = (permissionType: PermissionType, rules: Omit<PermissionRule, 'permission_type'>[]) => {
    const otherPermissions = permissions.filter(p => p.permission_type !== permissionType);
    const newRules = rules.map(r => ({ ...r, permission_type: permissionType }));
    return [...otherPermissions, ...newRules];
  };

  return {
    permissions,
    members,
    ranks,
    officerRankThreshold,
    loading,
    saving,
    savePermissions,
    getPermissionRules,
    updatePermissionRules,
    reload: loadData,
  };
}

// Hook to check if current user has a specific permission
export function useHasGuildPermission(guildId: string | null, permission: PermissionType) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!guildId) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasPermission(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc('has_guild_permission', {
          p_guild_id: guildId,
          p_user_id: user.id,
          p_permission: permission,
        });

        if (error) throw error;
        setHasPermission(data || false);
      } catch {
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [guildId, permission]);

  return { hasPermission, loading };
}
