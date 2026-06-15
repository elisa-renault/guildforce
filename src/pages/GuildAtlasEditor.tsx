import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Loader2,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { GuildAtlasDocument, GuildAtlasDocumentInput } from '@/hooks/useGuildAtlas';
import type { SemanticKey } from '@/i18n/semantic';
import type { AtlasDocStatus, AtlasVisibilityType } from '@/lib/guildAtlas';

import { CosmicBackground } from '@/components/CosmicBackground';
import { MarkdownEditor } from '@/components/forum';
import { GlowCard } from '@/components/GlowCard';
import { GuildWorkspaceShell } from '@/components/guild';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildAccessState } from '@/hooks/useGuildAccessState';
import { useGuildAtlas } from '@/hooks/useGuildAtlas';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { normalizeAtlasCollection, normalizeAtlasTags } from '@/lib/guildAtlas';
import { getGuildPath } from '@/lib/guildSlug';

const ATLAS_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

const visibilityOptions: AtlasVisibilityType[] = ['members', 'officers', 'rank', 'roster'];
const statusOptions: AtlasDocStatus[] = ['draft', 'published', 'archived'];

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
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language, translations: t, fallback });
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
  } = useGuildAtlas({
    guildId: guild?.id ?? null,
    canManage: canManageAtlas,
  });

  const selectedDocument = useMemo(
    () => documentId ? documents.find((doc) => doc.id === documentId) ?? null : null,
    [documentId, documents],
  );
  const [form, setForm] = useState<GuildAtlasDocumentInput>(() => createBlankInput(null));
  const [tagText, setTagText] = useState('');
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
    if (accessLoading || atlasLoading || !canManageAtlas) return;

    const stateKey = documentId || 'new';
    if (initializedFor === stateKey) return;

    if (documentId) {
      if (!selectedDocument) {
        navigate(atlasPath, { replace: true });
        return;
      }

      const nextForm = createInputFromDocument(selectedDocument);
      setForm(nextForm);
      setTagText(nextForm.tags.join(', '));
      setInitializedFor(stateKey);
      return;
    }

    const nextForm = createBlankInput(null);
    setForm(nextForm);
    setTagText(nextForm.tags.join(', '));
    setInitializedFor(stateKey);
  }, [
    accessLoading,
    atlasLoading,
    atlasPath,
    canManageAtlas,
    documentId,
    initializedFor,
    navigate,
    selectedDocument,
  ]);

  const handleVisibilityChange = (value: AtlasVisibilityType) => {
    setForm((current) => ({
      ...current,
      visibility_type: value,
      min_rank_index: value === 'rank' ? current.min_rank_index ?? 2 : null,
      roster_id: value === 'roster' ? current.roster_id : null,
    }));
  };

  const buildSaveInput = (statusOverride?: AtlasDocStatus): GuildAtlasDocumentInput => ({
    ...form,
    title: form.title.trim(),
    summary: form.summary?.trim() || null,
    collection: normalizeAtlasCollection(form.collection),
    tags: normalizeAtlasTags(tagText),
    status: statusOverride || form.status,
  });

  const handleSave = async (redirectAfterSave = true) => {
    const nextForm = buildSaveInput();
    const savedDocumentId = await saveDocument(nextForm, documentId);

    if (redirectAfterSave) {
      navigate(atlasPath, { replace: true });
      return;
    }

    if (!documentId && savedDocumentId) {
      navigate(`${atlasPath}/${savedDocumentId}/edit`, { replace: true });
    }
  };

  const handlePublish = async () => {
    await saveDocument(buildSaveInput('published'), documentId);
    navigate(atlasPath, { replace: true });
  };

  const handleUploadImage = async (file: File) => {
    if (file.size > ATLAS_IMAGE_MAX_SIZE) {
      throw new Error('Image is too large');
    }

    return uploadAtlasImage(file);
  };

  if (accessLoading || atlasLoading) {
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

  const selectedStatus = selectedDocument?.status ?? form.status;
  const saveDisabled = !form.title.trim()
    || mutating
    || (form.visibility_type === 'roster' && !form.roster_id);

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
      <PageContainer as="main" className="relative z-10 space-y-5 py-5 md:py-6" width="workspace">
        <PageHeader
          icon={Compass}
          title={isEditing ? s('guild.atlas.editor.edit_title') : s('guild.atlas.editor.new_title')}
          description={s('guild.atlas.editor.description')}
          meta={(
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {s(`guild.atlas.status.${selectedStatus}` as SemanticKey)}
            </Badge>
          )}
          actions={(
            <Button variant="outline" size="sm" onClick={() => navigate(atlasPath)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {s('guild.atlas.editor.back_to_library')}
            </Button>
          )}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.42fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <GlowCard hoverable={false} className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="atlas-title">{s('guild.atlas.editor.title')}</Label>
                <Input
                  id="atlas-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="atlas-summary">{s('guild.atlas.editor.summary')}</Label>
                <Textarea
                  id="atlas-summary"
                  value={form.summary || ''}
                  onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="atlas-collection">{s('guild.atlas.collection')}</Label>
                  <Input
                    id="atlas-collection"
                    value={form.collection || ''}
                    onChange={(event) => setForm((current) => ({ ...current, collection: event.target.value }))}
                    placeholder={s('guild.atlas.editor.collection_placeholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{s('guild.atlas.editor.status')}</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      status: value as AtlasDocStatus,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {s(`guild.atlas.status.${status}` as SemanticKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-card/20 p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {s('guild.atlas.visibility.label')}
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label>{s('guild.atlas.visibility.label')}</Label>
                    <Select value={form.visibility_type} onValueChange={(value) => handleVisibilityChange(value as AtlasVisibilityType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((visibility) => (
                          <SelectItem key={visibility} value={visibility}>
                            {s(`guild.atlas.visibility.${visibility}` as SemanticKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.visibility_type === 'rank' ? (
                    <div className="space-y-2">
                      <Label htmlFor="atlas-rank">{s('guild.atlas.editor.max_rank')}</Label>
                      <Input
                        id="atlas-rank"
                        type="number"
                        min={0}
                        max={9}
                        value={form.min_rank_index ?? 2}
                        onChange={(event) => setForm((current) => ({ ...current, min_rank_index: Number(event.target.value) }))}
                      />
                    </div>
                  ) : null}

                  {form.visibility_type === 'roster' ? (
                    <div className="space-y-2">
                      <Label>{s('guild.atlas.editor.roster')}</Label>
                      <Select
                        value={form.roster_id || ''}
                        onValueChange={(value) => setForm((current) => ({ ...current, roster_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={s('guild.atlas.editor.select_roster')} />
                        </SelectTrigger>
                        <SelectContent>
                          {rosters.map((roster) => (
                            <SelectItem key={roster.id} value={roster.id}>{roster.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="atlas-tags">{s('guild.atlas.editor.tags')}</Label>
                <Input
                  id="atlas-tags"
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  placeholder="raid, addons, onboarding"
                />
              </div>
            </GlowCard>
          </div>

          <GlowCard hoverable={false} className="space-y-3 p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-border/35 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label htmlFor="atlas-content">{s('guild.atlas.editor.content')}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{s('guild.atlas.editor.content_hint')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedDocument?.status === 'published' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void unpublishDocument(selectedDocument).then(() => {
                        setForm((current) => ({ ...current, status: 'draft' }));
                      });
                    }}
                    disabled={mutating}
                  >
                    {s('guild.atlas.unpublish')}
                  </Button>
                ) : null}
                {selectedDocument?.status === 'archived' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void restoreDocument(selectedDocument).then(() => {
                        setForm((current) => ({ ...current, status: 'draft' }));
                      });
                    }}
                    disabled={mutating}
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    {s('guild.atlas.restore')}
                  </Button>
                ) : selectedDocument ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void archiveDocument(selectedDocument).then(() => {
                        setForm((current) => ({ ...current, status: 'archived' }));
                      });
                    }}
                    disabled={mutating}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {s('guild.atlas.archive')}
                  </Button>
                ) : null}
              </div>
            </div>

            <MarkdownEditor
              value={form.content}
              onChange={(content) => setForm((current) => ({ ...current, content }))}
              placeholder={s('guild.atlas.editor.content_placeholder')}
              minHeight="520px"
              enableMentions={false}
              imageTools={{
                uploadImage: handleUploadImage,
                maxSizeBytes: ATLAS_IMAGE_MAX_SIZE,
              }}
            />

            <div className="flex flex-col-reverse gap-2 border-t border-border/35 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" onClick={() => navigate(atlasPath)}>
                {t.common.cancel}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleSave(false)}
                disabled={saveDisabled}
              >
                {t.common.save}
              </Button>
              <Button
                onClick={() => void handlePublish()}
                disabled={saveDisabled}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {form.status === 'published' ? t.common.save : t.common.publish}
              </Button>
            </div>
          </GlowCard>
        </div>
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

export default GuildAtlasEditor;
