import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { AtlasLibrarySurface, GuildWorkspaceShell } from '@/components/guild';
import { useGuildAccessState } from '@/hooks/useGuildAccessState';
import { useGuildAtlas } from '@/hooks/useGuildAtlas';
import { getGuildPath } from '@/lib/guildSlug';

const GuildAtlas = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const {
    loading: accessLoading,
    requiresAuth,
    notFound,
    guild,
    isMember,
    isGM,
    hasManageRosters,
    hasViewActivityLog,
    hasManageVault,
    hasViewVaultAudit,
    hasManageAtlas,
    hasVaultAccess,
  } = useGuildAccessState({
    regionSlug,
    serverSlug,
    guildSlug,
  });

  const canManageAtlas = isGM || hasManageAtlas;
  const {
    documents,
    loading: atlasLoading,
    mutating,
    publishDocument,
    unpublishDocument,
    archiveDocument,
    restoreDocument,
    deleteDocument,
  } = useGuildAtlas({
    guildId: guild?.id ?? null,
    canManage: canManageAtlas,
  });

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const atlasPath = `${basePath}/atlas`;

  useEffect(() => {
    if (accessLoading) return;

    if (requiresAuth) {
      navigate('/auth', { replace: true });
      return;
    }

    if (notFound || !guild) {
      navigate('/guilds', { replace: true });
      return;
    }

    if (!isMember && !isGM) {
      navigate(getGuildPath(guild.region || 'eu', guild.server, guild.name), { replace: true });
    }
  }, [accessLoading, guild, isGM, isMember, navigate, notFound, requiresAuth]);

  if (accessLoading || atlasLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild || (!isMember && !isGM)) {
    return null;
  }

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guild.id}
      basePath={basePath}
      isGM={isGM}
      hasSettingsPermission={isGM || hasManageRosters || hasViewActivityLog || hasManageVault || hasViewVaultAudit}
      hasVaultAccess={hasVaultAccess}
      activeTab="atlas"
    >
      <AtlasLibrarySurface
        documents={documents}
        canManageAtlas={canManageAtlas}
        mutating={mutating}
        onCreate={() => navigate(`${atlasPath}/new`)}
        onEdit={(document) => navigate(`${atlasPath}/${document.id}/edit`)}
        onPublish={publishDocument}
        onUnpublish={unpublishDocument}
        onArchive={archiveDocument}
        onRestore={restoreDocument}
        onDelete={deleteDocument}
      />
    </GuildWorkspaceShell>
  );
};

export default GuildAtlas;
