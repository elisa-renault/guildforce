import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { GuildSubNav } from '@/components/guild/GuildSubNav';
import { PageContainer } from '@/components/layout/PageContainer';
import { GuildVaultSection } from '@/components/settings';
import { useGuildAccessState } from '@/hooks/useGuildAccessState';
import { getGuildPath } from '@/lib/guildSlug';

const GuildVault = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const {
    loading,
    requiresAuth,
    notFound,
    guild,
    isGM,
    hasManageRosters,
    hasViewActivityLog,
    hasManageVault,
    hasViewVaultAudit,
    hasVaultAccess,
  } = useGuildAccessState({
    regionSlug,
    serverSlug,
    guildSlug,
  });

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

    if (!guild || isGM || hasVaultAccess) {
      return;
    }

    navigate(getGuildPath(guild.region || 'eu', guild.server, guild.name), { replace: true });
  }, [guild, hasVaultAccess, isGM, loading, navigate, notFound, requiresAuth]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild || (!isGM && !hasVaultAccess)) {
    return null;
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <GuildSubNav
        guild={guild}
        guildId={guild.id}
        basePath={basePath}
        isGM={isGM}
        hasSettingsPermission={isGM || hasManageRosters || hasViewActivityLog || hasManageVault || hasViewVaultAudit}
        hasVaultAccess={hasVaultAccess}
        activeTab="vault"
      />

      <PageContainer as="main" className="relative z-10 py-4 md:py-6" width="wide">
        <GlowCard className="border-border/30 bg-card/10 p-3 md:p-4">
          <GuildVaultSection
            guildId={guild.id}
            canManageVault={isGM || hasManageVault}
            officerRankThreshold={guild.officer_rank_threshold ?? 2}
          />
        </GlowCard>
      </PageContainer>
    </div>
  );
};

export default GuildVault;
