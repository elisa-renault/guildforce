import { useEffect, useState } from 'react';

import {
  GuildVaultSurface,
  type GuildMemberOption,
  type GuildRankOption,
} from '@/components/settings/GuildVaultSurface';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import { useGuildVault } from '@/hooks/useGuildVault';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import { toNormalizedRealmSlug } from '@/lib/guildDiscovery';
import { formatRankLabel } from '@/lib/rankLabel';

interface GuildVaultSectionProps {
  guildId: string;
  canManageVault: boolean;
  officerRankThreshold?: number;
}

export const GuildVaultSection = ({
  guildId,
  canManageVault,
  officerRankThreshold = 2,
}: GuildVaultSectionProps) => {
  const { t } = useLanguage();
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });
  const { rankLabels } = useGuildRankLabels({ guildId });
  const [members, setMembers] = useState<GuildMemberOption[]>([]);
  const [ranks, setRanks] = useState<GuildRankOption[]>([]);
  const {
    secrets,
    loading,
    mutating,
    createSecret,
    updateSecret,
    rotateSecret,
    archiveSecret,
    revealSecret,
    loadSecretAccessRules,
    saveSecretAccessRules,
  } = useGuildVault({ guildId, includeAudit: false });

  useEffect(() => {
    let cancelled = false;

    const loadAccessOptions = async () => {
      try {
        const { data: membersData } = await supabase
          .from('guild_members')
          .select('user_id')
          .eq('guild_id', guildId);

        if (cancelled) return;

        if (membersData && membersData.length > 0) {
          const userIds = membersData.map((member) => member.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);

          if (cancelled) return;

          setMembers(
            membersData.map((member) => ({
              user_id: member.user_id,
              username: profilesData?.find((profile) => profile.id === member.user_id)?.username || 'Unknown',
            })),
          );
        } else {
          setMembers([]);
        }

        const { data: guildData } = await supabase
          .from('guilds')
          .select('name, server, region')
          .eq('id', guildId)
          .maybeSingle();

        if (cancelled || !guildData) return;

        const { data: ranksData } = await supabase
          .from('wow_guild_memberships')
          .select('rank_index, rank_name')
          .ilike('guild_name', guildData.name)
          .ilike('guild_realm_slug', toNormalizedRealmSlug(guildData.server))
          .ilike('guild_region', guildData.region);

        if (cancelled) return;

        if (!ranksData) {
          setRanks([]);
          return;
        }

        const uniqueRanks = new Map<number, string>();
        ranksData.forEach((rank) => {
          if (!uniqueRanks.has(rank.rank_index)) {
            uniqueRanks.set(
              rank.rank_index,
              formatRankLabel({
                rankName: rank.rank_name,
                rankIndex: rank.rank_index,
                rankLabel,
                guildMasterLabel: t.guild.rank0,
                customLabel: rankLabels[rank.rank_index],
              }),
            );
          }
        });

        setRanks(
          Array.from(uniqueRanks.entries())
            .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
            .sort((left, right) => left.rank_index - right.rank_index),
        );
      } catch {
        if (!cancelled) {
          setMembers([]);
          setRanks([]);
        }
      }
    };

    void loadAccessOptions();

    return () => {
      cancelled = true;
    };
  }, [guildId, rankLabel, rankLabels, t.guild.rank0]);

  const uploadIllustration = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `${guildId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('guild-vault-images')
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('guild-vault-images').getPublicUrl(filePath);
    return {
      filePath,
      publicUrl: `${data.publicUrl}?t=${Date.now()}`,
    };
  };

  const rollbackUploadedIllustration = async (filePath: string) => {
    await supabase.storage.from('guild-vault-images').remove([filePath]);
  };

  return (
    <GuildVaultSurface
      guildId={guildId}
      canManageVault={canManageVault}
      officerRankThreshold={officerRankThreshold}
      secrets={secrets}
      loading={loading}
      mutating={mutating}
      members={members}
      ranks={ranks}
      createSecret={createSecret}
      updateSecret={updateSecret}
      rotateSecret={rotateSecret}
      archiveSecret={archiveSecret}
      revealSecret={revealSecret}
      loadSecretAccessRules={loadSecretAccessRules}
      saveSecretAccessRules={saveSecretAccessRules}
      uploadIllustration={uploadIllustration}
      rollbackUploadedIllustration={rollbackUploadedIllustration}
    />
  );
};
