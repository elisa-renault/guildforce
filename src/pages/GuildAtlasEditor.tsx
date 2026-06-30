import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { GuildAtlasDocument, GuildAtlasDocumentInput } from '@/hooks/useGuildAtlas';

import { CosmicBackground } from '@/components/CosmicBackground';
import { AtlasEditorSurface, GuildWorkspaceShell } from '@/components/guild';
import { useGuildAccessState } from '@/hooks/useGuildAccessState';
import { useGuildAtlas } from '@/hooks/useGuildAtlas';
import { getGuildPath } from '@/lib/guildSlug';

const createBlankInput = (ownerUserId: string | null): GuildAtlasDocumentInput => ({
  title: '',
  summary: null,
  content: '',
  collection: null,
  tags: [],
  status: 'draft',
  visibility_type: 'members',
  min_rank_index: null,
  roster_id: null,
  owner_user_id: ownerUserId,
});

const createInputFromDocument = (doc: GuildAtlasDocument): GuildAtlasDocumentInput => ({
  title: doc.title,
  summary: doc.summary,
  content: doc.content,
  collection: doc.collection,
  tags: doc.tags,
  status: doc.status,
  visibility_type: doc.visibility_type,
  min_rank_index: doc.min_rank_index,
  roster_id: doc.roster_id,
  owner_user_id: doc.owner_user_id,
});

const GuildAtlasEditor = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, documentId } = useParams();
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
  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const atlasPath = `${basePath}/atlas`;
  const isEditing = Boolean(documentId);

  const {
    documents,
    rosters,
    loading: atlasLoading,
    mutating,
    saveDocument,
    unpublishDocument,
    archiveDocument,
    restoreDocument,
    uploadAtlasImage,
    loadDocument,
  } = useGuildAtlas({
    guildId: guild?.id ?? null,
    canManage: canManageAtlas,
  });

  const listedDocument = useMemo(
    () => documentId ? documents.find((doc) => doc.id === documentId) ?? null : null,
    [documentId, documents],
  );
  const [loadedDocument, setLoadedDocument] = useState<GuildAtlasDocument | null>(null);
  const [documentLookupLoading, setDocumentLookupLoading] = useState(false);
  const [missingDocumentId, setMissingDocumentId] = useState<string | null>(null);
  const selectedDocument = listedDocument
    ?? (loadedDocument?.id === documentId ? loadedDocument : null);
  const isDocumentLookupPending = Boolean(documentId && !selectedDocument && documentLookupLoading);
  const [initialData, setInitialData] = useState<GuildAtlasDocumentInput>(() => createBlankInput(null));
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

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
      return;
    }

    if (!canManageAtlas) {
      navigate(atlasPath, { replace: true });
    }
  }, [accessLoading, atlasPath, canManageAtlas, guild, isGM, isMember, navigate, notFound, requiresAuth]);

  useEffect(() => {
    setLoadedDocument(null);
    setMissingDocumentId(null);
    setDocumentLookupLoading(false);
    setInitializedFor(null);
  }, [documentId]);

  useEffect(() => {
    if (!documentId || !guild?.id || atlasLoading || !canManageAtlas) return;
    if (listedDocument || loadedDocument?.id === documentId || missingDocumentId === documentId) return;

    let cancelled = false;
    setDocumentLookupLoading(true);

    void loadDocument(documentId)
      .then((document) => {
        if (cancelled) return;

        if (document) {
          setLoadedDocument(document);
          return;
        }

        setMissingDocumentId(documentId);
      })
      .catch(() => {
        if (!cancelled) {
          setMissingDocumentId(documentId);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDocumentLookupLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    atlasLoading,
    canManageAtlas,
    documentId,
    guild?.id,
    listedDocument,
    loadDocument,
    loadedDocument?.id,
    missingDocumentId,
  ]);

  useEffect(() => {
    if (accessLoading || atlasLoading || isDocumentLookupPending || !canManageAtlas) return;

    const stateKey = documentId || 'new';
    if (initializedFor === stateKey) return;

    if (documentId) {
      if (!selectedDocument) {
        if (missingDocumentId === documentId) {
          navigate(atlasPath, { replace: true });
        }
        return;
      }

      setInitialData(createInputFromDocument(selectedDocument));
      setInitializedFor(stateKey);
      return;
    }

    setInitialData(createBlankInput(null));
    setInitializedFor(stateKey);
  }, [
    accessLoading,
    atlasLoading,
    atlasPath,
    canManageAtlas,
    documentId,
    initializedFor,
    isDocumentLookupPending,
    missingDocumentId,
    navigate,
    selectedDocument,
  ]);

  const handleSave = async (input: GuildAtlasDocumentInput, redirectAfterSave = true) => {
    const savedDocumentId = await saveDocument(input, documentId);

    if (redirectAfterSave) {
      navigate(atlasPath, { replace: true });
      return;
    }

    if (!documentId && savedDocumentId) {
      navigate(`${atlasPath}/${savedDocumentId}/edit`, { replace: true });
    }
  };

  const handlePublish = async (input: GuildAtlasDocumentInput) => {
    await saveDocument(input, documentId);
    navigate(atlasPath, { replace: true });
  };

  if (accessLoading || atlasLoading || isDocumentLookupPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild || (!isMember && !isGM) || !canManageAtlas) {
    return null;
  }

  const selectedStatus = selectedDocument?.status ?? initialData.status;

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
      <AtlasEditorSurface
        resetKey={initializedFor || documentId || 'new'}
        isEditing={isEditing}
        initialData={initialData}
        selectedStatus={selectedStatus}
        selectedDocumentStatus={selectedDocument?.status ?? null}
        rosters={rosters}
        mutating={mutating}
        onBack={() => navigate(atlasPath)}
        onSave={handleSave}
        onPublish={handlePublish}
        onUnpublish={selectedDocument ? () => unpublishDocument(selectedDocument) : undefined}
        onArchive={selectedDocument ? () => archiveDocument(selectedDocument) : undefined}
        onRestore={selectedDocument ? () => restoreDocument(selectedDocument) : undefined}
        uploadImage={uploadAtlasImage}
      />
    </GuildWorkspaceShell>
  );
};

export default GuildAtlasEditor;
