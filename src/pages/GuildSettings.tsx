import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { GuildPermissionsEditor, MyPermissionsCard } from '@/components/permissions';
import { RosterManager } from '@/components/roster';
import {
  GuildActivitySection,
  GuildBattleNetSection,
  GuildProfileSection,
  GuildSettingsSurface,
  type SettingsSection,
} from '@/components/settings';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildAccessState, type GuildAccessStateGuild } from '@/hooks/useGuildAccessState';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import { KILL_SWITCH_FEATURE_FLAGS, useKillSwitchFeatureEnabled } from '@/lib/featureFlags';
import { toNormalizedRealmSlug } from '@/lib/guildDiscovery';
import { getVisibleGuildSettingsSections, guildSettingsSectionLabelKeys } from '@/lib/guildSettingsSections';
import { getGuildPath } from '@/lib/guildSlug';
import { formatRankLabel } from '@/lib/rankLabel';

type GuildData = GuildAccessStateGuild;

interface AccessRule {
  id: string;
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

interface Roster {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  access_rules: AccessRule[];
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

const GuildSettings = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section') as SettingsSection | null;
  const initialRosterId = searchParams.get('roster');
  const { t } = useLanguage();
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });
  const {
    loading,
    requiresAuth,
    notFound,
    guild,
    isGM,
    hasManageWishes,
    hasManageRosters,
    hasViewActivityLog,
    hasManageVault,
    hasViewVaultAudit,
    hasVaultAccess,
    reloadGuildAccess,
  } = useGuildAccessState({
    regionSlug,
    serverSlug,
    guildSlug,
  });

  const [displayGuild, setDisplayGuild] = useState<GuildData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [officerRank, setOfficerRank] = useState<number>(2);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const { rankLabels, reload: reloadRankLabels } = useGuildRankLabels({ guildId: displayGuild?.id });
  const vaultEnabled = useKillSwitchFeatureEnabled(KILL_SWITCH_FEATURE_FLAGS.vault);

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const hasSettingsAccess =
    isGM || hasManageWishes || hasManageRosters || hasViewActivityLog || hasManageVault || hasViewVaultAudit;
  const hasVaultPageAccess = vaultEnabled && (isGM || hasVaultAccess);
  const visibleSections = getVisibleGuildSettingsSections({
    gm: isGM,
    wishes: hasManageWishes,
    rosters: hasManageRosters,
    activity: hasViewActivityLog || hasManageVault || hasViewVaultAudit,
  });

  const loadRostersAndMembers = useCallback(
    async (guildRecord: GuildData) => {
      setLoadingDetails(true);

      try {
        const { data: rostersData } = await supabase
          .from('rosters')
          .select('*')
          .eq('guild_id', guildRecord.id)
          .order('is_default', { ascending: false })
          .order('created_at');

        if (rostersData) {
          const rostersWithRules: Roster[] = await Promise.all(
            rostersData.map(async (roster) => {
              const { data: rulesData } = await supabase
                .from('roster_access_rules')
                .select('*')
                .eq('roster_id', roster.id);

              return {
                id: roster.id,
                name: roster.name,
                description: roster.description,
                is_default: roster.is_default,
                access_rules: (rulesData || []).map((rule) => ({
                  id: rule.id,
                  access_type: rule.access_type as 'user' | 'rank',
                  user_id: rule.user_id ?? undefined,
                  min_rank_index: rule.min_rank_index ?? undefined,
                  max_rank_index: rule.max_rank_index ?? undefined,
                })),
              };
            }),
          );

          setRosters(rostersWithRules);
        } else {
          setRosters([]);
        }

        const { data: membersData } = await supabase
          .from('guild_members')
          .select('user_id')
          .eq('guild_id', guildRecord.id);

        if (membersData && membersData.length > 0) {
          const userIds = membersData.map((member) => member.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);

          const membersWithNames: GuildMember[] = membersData.map((member) => ({
            user_id: member.user_id,
            username: profilesData?.find((profile) => profile.id === member.user_id)?.username || 'Unknown',
          }));

          setMembers(membersWithNames);
        } else {
          setMembers([]);
        }

        const { data: ranksData } = await supabase
          .from('wow_guild_memberships')
          .select('rank_index, rank_name')
          .ilike('guild_name', guildRecord.name)
          .ilike('guild_realm_slug', toNormalizedRealmSlug(guildRecord.server))
          .ilike('guild_region', guildRecord.region);

        if (ranksData) {
          const uniqueRanks = new Map<number, string>();

          ranksData.forEach((rank) => {
            if (!uniqueRanks.has(rank.rank_index)) {
              const normalizedLabel = formatRankLabel({
                rankName: rank.rank_name,
                rankIndex: rank.rank_index,
                rankLabel,
                guildMasterLabel: t.guild.rank0,
                customLabel: rankLabels[rank.rank_index],
              });
              uniqueRanks.set(rank.rank_index, normalizedLabel);
            }
          });

          const ranksArray: GuildRank[] = Array.from(uniqueRanks.entries())
            .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
            .sort((left, right) => left.rank_index - right.rank_index);

          setRanks(ranksArray);
        } else {
          setRanks([]);
        }
      } finally {
        setLoadingDetails(false);
      }
    },
    [rankLabel, rankLabels, t.guild.rank0],
  );

  useEffect(() => {
    if (!guild) return;

    setLoadingDetails(true);
    setDisplayGuild(guild);
    setOfficerRank(guild.officer_rank_threshold ?? 2);
  }, [guild]);

  useEffect(() => {
    if (loading) return;

    if (requiresAuth) {
      navigate('/auth', { replace: true });
      return;
    }

    if (notFound) {
      navigate('/guilds', { replace: true });
      return;
    }

    if (!guild) {
      return;
    }

    if (requestedSection === 'vault' && hasVaultPageAccess) {
      navigate(`${basePath}/vault`, { replace: true });
      return;
    }

    if (!hasSettingsAccess) {
      navigate(getGuildPath(guild.region || 'eu', guild.server, guild.name), { replace: true });
    }
  }, [
    basePath,
    guild,
    hasSettingsAccess,
    hasVaultPageAccess,
    loading,
    navigate,
    notFound,
    requestedSection,
    requiresAuth,
  ]);

  useEffect(() => {
    if (!displayGuild || !hasSettingsAccess) return;

    loadRostersAndMembers(displayGuild);
  }, [displayGuild, hasSettingsAccess, loadRostersAndMembers]);

  useEffect(() => {
    if (loading || !displayGuild || !hasSettingsAccess) return;
    if (requestedSection === 'vault' && hasVaultPageAccess) return;

    const nextSection =
      requestedSection && requestedSection !== 'vault' && visibleSections.includes(requestedSection)
        ? requestedSection
        : visibleSections[0] || 'profile';

    setActiveSection((current) => (current === nextSection ? current : nextSection));

    if (requestedSection !== nextSection) {
      setSearchParams({ section: nextSection }, { replace: true });
    }
  }, [
    displayGuild,
    hasSettingsAccess,
    hasVaultPageAccess,
    loading,
    requestedSection,
    setSearchParams,
    visibleSections,
  ]);

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    setSearchParams({ section }, { replace: true });
  };

  const handleResyncComplete = async () => {
    if (!displayGuild) return;

    await reloadGuildAccess();
    await loadRostersAndMembers(displayGuild);

    const { data: updatedGuild } = await supabase
      .from('guilds')
      .select('id, name, server, region, faction, avatar_url, officer_rank_threshold')
      .eq('id', displayGuild.id)
      .single();

    if (updatedGuild) {
      setDisplayGuild(updatedGuild);
      setOfficerRank(updatedGuild.officer_rank_threshold ?? 2);
    }
  };

  const pageLoading = loading || (hasSettingsAccess && (!displayGuild || loadingDetails));

  if (pageLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!displayGuild || !hasSettingsAccess) {
    return null;
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
                <GuildProfileSection
                  guild={displayGuild}
                  ranks={ranks}
                  officerRank={officerRank}
                  isGM={isGM}
                  rankLabels={rankLabels}
                  onRankLabelsUpdate={() => {
                    void reloadRankLabels();
                  }}
                  onOfficerRankChange={setOfficerRank}
                  onGuildUpdate={setDisplayGuild}
                />
        );

      case 'permissions':
        return (
          <GlowCard surface="section">
            <GuildPermissionsEditor guildId={displayGuild.id} />
          </GlowCard>
        );

      case 'rosters':
        return (
          <RosterManager
            guildId={displayGuild.id}
            rosters={rosters}
            members={members}
            ranks={ranks}
            onRosterChange={() => loadRostersAndMembers(displayGuild)}
            initialRosterId={initialRosterId}
          />
        );

      case 'activity':
        return (
          <GuildActivitySection
            guildId={displayGuild.id}
            showVaultAudit={isGM || hasManageVault || hasViewVaultAudit}
          />
        );

      case 'battlenet':
        return (
          <GuildBattleNetSection
            guildId={displayGuild.id}
            isOwnerOrGM={isGM}
            onResyncComplete={handleResyncComplete}
          />
        );

      case 'mypermissions':
        return (
          <GlowCard surface="section">
            <MyPermissionsCard guildId={displayGuild.id} isGM={isGM} />
          </GlowCard>
        );

      default:
        return null;
    }
  };

  return (
    <GuildSettingsSurface
      guild={displayGuild}
      guildId={displayGuild.id}
      basePath={basePath}
      isGM={isGM}
      hasSettingsPermission={hasSettingsAccess}
      hasVaultAccess={hasVaultAccess}
      activeSection={activeSection}
      visibleSections={visibleSections}
      onSectionChange={handleSectionChange}
      contextLabel={resolveSemanticMessage({
        key: guildSettingsSectionLabelKeys[activeSection],
        language: t.lang,
        translations: t,
      })}
    >
      {renderSectionContent()}
    </GuildSettingsSurface>
  );
};

export default GuildSettings;
