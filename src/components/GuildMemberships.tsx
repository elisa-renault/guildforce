import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from './GlowCard';
import { Badge } from '@/components/ui/badge';
import { CosmicButton } from './CosmicButton';
import { Crown, Users, Shield, Loader2, Clock } from 'lucide-react';
import { getClassNameFromBattleNet } from '@/data/battlenetClasses';
import { resolveSemanticMessage } from '@/i18n/semantic';
import type { GuildRankLabelMap } from '@/lib/rankLabel';
import { buildGuildDiscoveryKey } from '@/lib/guildDiscovery';
import { formatRankLabel } from '@/lib/rankLabel';

interface GuildMembership {
  id: string;
  guild_name: string;
  guild_realm: string;
  guild_realm_slug: string;
  guild_region: string;
  guild_faction: string;
  rank_index: number;
  rank_name: string | null;
  is_guild_master: boolean;
  character_id: string;
  wow_characters?: {
    name: string;
    realm: string;
    class_id: number;
  };
}

interface AppGuild {
  id: string;
  name: string;
  server: string;
  region: string | null;
  owner_id: string | null;
}

const dedupeGuildsById = <T extends { id: string }>(guilds: T[]) =>
  Array.from(new Map(guilds.map((guild) => [guild.id, guild])).values());

export const GuildMemberships: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });
  const [guildRankLabels, setGuildRankLabels] = useState<Record<string, GuildRankLabelMap>>({});
  const getRankLabel = (guildId: string | null, rankName: string | null, index: number) =>
    formatRankLabel({
      rankName,
      rankIndex: index,
      rankLabel,
      guildMasterLabel: t.guild.rank0,
      customLabel: guildId ? guildRankLabels[guildId]?.[index] : undefined,
    });
  const [memberships, setMemberships] = useState<GuildMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appGuilds, setAppGuilds] = useState<Map<string, { id: string; role: string; hasOwner: boolean }>>(new Map());

  const isConnected = !!profile?.battlenet_id;

  // Fetch app guilds the user is a member of
  useEffect(() => {
    if (user?.id) {
      fetchAppGuilds();
    }
  }, [user?.id]);

  useEffect(() => {
    if (appGuilds.size === 0) {
      setGuildRankLabels({});
      return;
    }

    const loadRankLabels = async () => {
      const guildIds = Array.from(appGuilds.values()).map((guild) => guild.id);
      const { data, error } = await supabase
        .from('guild_rank_labels')
        .select('guild_id, rank_index, label')
        .in('guild_id', guildIds);

      if (error) {
        setGuildRankLabels({});
        return;
      }

      const nextLabels = (data ?? []).reduce<Record<string, GuildRankLabelMap>>((acc, row) => {
        const normalized = row.label.trim();
        if (!normalized) return acc;

        if (!acc[row.guild_id]) {
          acc[row.guild_id] = {};
        }

        acc[row.guild_id][row.rank_index] = normalized;
        return acc;
      }, {});

      setGuildRankLabels(nextLabels);
    };

    void loadRankLabels();
  }, [appGuilds]);

  useEffect(() => {
    if (isConnected && user?.id) {
      fetchMemberships();
    }
  }, [isConnected, user?.id]);

  const fetchAppGuilds = async () => {
    if (!user?.id) return;

    const { data: memberships } = await supabase
      .from('guild_members')
      .select('guild_id, role')
      .eq('user_id', user.id);

    const membershipGuildIds = Array.from(new Set((memberships || []).map((membership) => membership.guild_id)));

    const [memberGuildsResult, ownedGuildsResult] = await Promise.all([
      membershipGuildIds.length > 0
        ? supabase
            .from('guilds')
            .select('id, name, server, region, owner_id')
            .in('id', membershipGuildIds)
        : Promise.resolve({
            data: [] as AppGuild[],
            error: null,
          }),
      supabase
        .from('guilds')
        .select('id, name, server, region, owner_id')
        .eq('owner_id', user.id),
    ]);

    const visibleGuilds = dedupeGuildsById([
      ...(memberGuildsResult.data || []),
      ...(ownedGuildsResult.data || []),
    ]);

    if (visibleGuilds) {
      const membershipRoleByGuildId = new Map((memberships || []).map((membership) => [membership.guild_id, membership.role]));

      setAppGuilds(new Map(
        visibleGuilds.map((guild) => [
          buildGuildDiscoveryKey({
            region: guild.region || 'eu',
            guildName: guild.name,
            realmNameOrSlug: guild.server,
          }),
          {
            id: guild.id,
            role: membershipRoleByGuildId.get(guild.id) || (guild.owner_id === user.id ? 'gm' : 'member'),
            hasOwner: guild.owner_id !== null,
          },
        ])
      ));
    }
  };

  const fetchMemberships = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wow_guild_memberships')
        .select(`
          *,
          wow_characters (
            name,
            realm,
            class_id
          )
        `)
        .eq('user_id', user.id)
        .order('rank_index', { ascending: true });

      if (error) throw error;
      setMemberships(data || []);
    } catch {
      // Guild memberships fetch error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const getClassName = (classId: number) => {
    return getClassNameFromBattleNet(classId);
  };

  const getAppGuildInfo = (guildName: string, guildRealm: string, guildRegion: string): { id: string; role: string; hasOwner: boolean } | null => {
    return appGuilds.get(buildGuildDiscoveryKey({
      region: guildRegion || 'eu',
      guildName,
      realmNameOrSlug: guildRealm,
    })) || null;
  };

  if (!isConnected) {
    return null;
  }

  // Group memberships by guild
  const guildGroups = memberships.reduce((acc, membership) => {
    const key = `${membership.guild_name}-${membership.guild_realm_slug}`;
    if (!acc[key]) {
      acc[key] = {
        guild_name: membership.guild_name,
        guild_realm: membership.guild_realm,
        guild_region: membership.guild_region,
        guild_faction: membership.guild_faction,
        is_gm: false,
        members: [],
      };
    }
    if (membership.is_guild_master) {
      acc[key].is_gm = true;
    }
    acc[key].members.push(membership);
    return acc;
  }, {} as Record<string, { guild_name: string; guild_realm: string; guild_region: string; guild_faction: string; is_gm: boolean; members: GuildMembership[] }>);

  const guilds = Object.values(guildGroups);

  return (
    <GlowCard surface="section">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-medium text-foreground">{t.guild.myGuilds}</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : guilds.length > 0 ? (
        <div className="space-y-4">
          {guilds.map((guild) => {
            const appGuildInfo = getAppGuildInfo(guild.guild_name, guild.guild_realm, guild.guild_region);
            const isInApp = !!appGuildInfo;
            const isAppGM = appGuildInfo?.role === 'gm';
            const isOrphan = appGuildInfo && !appGuildInfo.hasOwner;

            return (
              <div
                key={`${guild.guild_name}-${guild.guild_realm}`}
                className={`p-4 rounded-lg border transition-colors ${
                  isInApp
                    ? isAppGM
                      ? 'border-warning/50 bg-warning/10'
                      : 'border-primary/50 bg-primary/10'
                    : 'border-border/50 bg-background/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {guild.is_gm ? (
                      <Crown className="w-5 h-5 text-warning" />
                    ) : (
                      <Users className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <h4 className="font-medium text-foreground">{guild.guild_name}</h4>
                      <p className="text-xs text-muted-foreground">{guild.guild_realm}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="text-muted-foreground border-border/50"
                    >
                      {guild.guild_faction === 'HORDE' ? 'Horde' : 'Alliance'}
                    </Badge>
                    {guild.is_gm && (
                      <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/50">
                        <Crown className="w-3 h-3 mr-1" />
                        {t.guild.guildMaster}
                      </Badge>
                    )}
                    {isOrphan && (
                      <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/50">
                        <Clock className="w-3 h-3 mr-1" />
                        {t.guild.awaitingGM}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Characters in this guild */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.guild.yourCharacters}:
                  </p>
                  {guild.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded bg-background/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-wow-${getClassName(member.wow_characters?.class_id || 0)}`}>
                          {member.wow_characters?.name || 'Unknown'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {member.is_guild_master ? (
                          <span className="text-warning">{t.guild.rank0}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {getRankLabel(appGuildInfo?.id ?? null, member.rank_name, member.rank_index)}
                          </span>
                        )}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Actions - show access button if guild exists in app */}
                {isInApp && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <CosmicButton
                      size="sm"
                      onClick={() => navigate(isAppGM ? `/guild/${appGuildInfo.id}` : `/guild/${appGuildInfo.id}/wishes`)}
                      className="w-full"
                    >
                      <Shield className="w-4 h-4 mr-2" strokeWidth={1.5} />
                      {t.guild.accessGuild}
                    </CosmicButton>
                  </div>
                )}

                {/* If not in app and is GM, show message that guild will be created on next sync */}
                {!isInApp && guild.is_gm && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground text-center">
                      {t.guild.pendingSync}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t.guild.noGuilds}
        </p>
      )}
    </GlowCard>
  );
};

