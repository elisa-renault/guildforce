import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';

export interface GuildAccessStateGuild {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url: string | null;
  officer_rank_threshold: number;
}

interface UseGuildAccessStateArgs {
  regionSlug?: string;
  serverSlug?: string;
  guildSlug?: string;
}

interface GuildAccessState {
  loading: boolean;
  requiresAuth: boolean;
  notFound: boolean;
  guild: GuildAccessStateGuild | null;
  isGM: boolean;
  hasManageRosters: boolean;
  hasViewActivityLog: boolean;
  hasManageVault: boolean;
  hasViewVaultAudit: boolean;
  hasVaultAccess: boolean;
}

const INITIAL_STATE: GuildAccessState = {
  loading: true,
  requiresAuth: false,
  notFound: false,
  guild: null,
  isGM: false,
  hasManageRosters: false,
  hasViewActivityLog: false,
  hasManageVault: false,
  hasViewVaultAudit: false,
  hasVaultAccess: false,
};

export function useGuildAccessState({
  regionSlug,
  serverSlug,
  guildSlug,
}: UseGuildAccessStateArgs) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<GuildAccessState>(INITIAL_STATE);

  const loadGuildAccess = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setState({
        ...INITIAL_STATE,
        loading: false,
        requiresAuth: true,
      });
      return;
    }

    if (!regionSlug || !serverSlug || !guildSlug) {
      setState({
        ...INITIAL_STATE,
        loading: false,
        notFound: true,
      });
      return;
    }

    setState((current) => ({ ...current, loading: true, requiresAuth: false, notFound: false }));

    const matchedBase = await findGuildByRouteSlugs({
      supabase,
      regionSlug,
      serverSlug,
      guildSlug,
    });

    if (!matchedBase) {
      setState({
        ...INITIAL_STATE,
        loading: false,
        notFound: true,
      });
      return;
    }

    const { data: matchedGuild } = await supabase
      .from('guilds')
      .select('id, name, server, region, faction, avatar_url, officer_rank_threshold')
      .eq('id', matchedBase.id)
      .maybeSingle();

    if (!matchedGuild) {
      setState({
        ...INITIAL_STATE,
        loading: false,
        notFound: true,
      });
      return;
    }

    const [
      gmResult,
      rostersPermResult,
      activityPermResult,
      manageVaultResult,
      viewVaultAuditResult,
      anyVaultAccessResult,
    ] = await Promise.all([
      supabase.rpc('is_guild_owner_or_gm', {
        _guild_id: matchedGuild.id,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: matchedGuild.id,
        p_permission: 'manage_rosters',
        p_user_id: user.id,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: matchedGuild.id,
        p_permission: 'view_activity_log',
        p_user_id: user.id,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: matchedGuild.id,
        p_permission: 'manage_vault',
        p_user_id: user.id,
      }),
      supabase.rpc('has_guild_permission', {
        p_guild_id: matchedGuild.id,
        p_permission: 'view_vault_audit',
        p_user_id: user.id,
      }),
      supabase.rpc('has_any_guild_secret_access', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      }),
    ]);

    setState({
      loading: false,
      requiresAuth: false,
      notFound: false,
      guild: matchedGuild,
      isGM: Boolean(gmResult.data),
      hasManageRosters: Boolean(rostersPermResult.data),
      hasViewActivityLog: Boolean(activityPermResult.data),
      hasManageVault: Boolean(manageVaultResult.data),
      hasViewVaultAudit: Boolean(viewVaultAuditResult.data),
      hasVaultAccess: Boolean(anyVaultAccessResult.data),
    });
  }, [authLoading, guildSlug, regionSlug, serverSlug, user]);

  useEffect(() => {
    loadGuildAccess();
  }, [loadGuildAccess]);

  return {
    ...state,
    reloadGuildAccess: loadGuildAccess,
  };
}
