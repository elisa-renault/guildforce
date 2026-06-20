import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  Edit3,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { GuildAtlasDocument } from '@/hooks/useGuildAtlas';
import type { SemanticKey } from '@/i18n/semantic';
import type { AtlasFilters, AtlasVisibilityType } from '@/lib/guildAtlas';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { GuildWorkspaceShell } from '@/components/guild';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterBar, FilterSearchField, activeFilterControlClassName, filterControlClassName } from '@/components/ui/filter-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildAccessState } from '@/hooks/useGuildAccessState';
import { useGuildAtlas } from '@/hooks/useGuildAtlas';
import { resolveSemanticMessage } from '@/i18n/semantic';
import {
  UNCATEGORIZED_COLLECTION,
  buildAtlasCollections,
  filterAtlasDocuments,
  normalizeAtlasCollection,
} from '@/lib/guildAtlas';
import { getGuildPath } from '@/lib/guildSlug';
import { cn } from '@/lib/utils';

const formatDate = (value: string | null) => {
  if (!value) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
};

const statusTone = {
  draft: 'border-status-warning/35 bg-status-warning/10 text-status-warning',
  published: 'border-status-success/35 bg-status-success/10 text-status-success',
  archived: 'border-muted-foreground/35 bg-muted/20 text-muted-foreground',
} as const;

const visibilityOptions: AtlasVisibilityType[] = ['members', 'officers', 'rank', 'roster'];

const GuildAtlas = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const {
    documents,
    loading: atlasLoading,
    mutating,
    publishDocument,
    unpublishDocument,
    archiveDocument,
    restoreDocument,
  } = useGuildAtlas({
    guildId: guild?.id ?? null,
    canManage: canManageAtlas,
  });

  const [filters, setFilters] = useState<AtlasFilters>({
    query: '',
    collection: 'all',
    status: 'active',
    visibility: 'all',
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

  const selectedDoc = useMemo(() => {
    const selectedId = searchParams.get('doc');
    return selectedId ? documents.find((doc) => doc.id === selectedId) ?? null : null;
  }, [documents, searchParams]);

  const collections = useMemo(() => buildAtlasCollections(documents), [documents]);
  const hasUncategorized = documents.some((doc) => !normalizeAtlasCollection(doc.collection));
  const filteredDocs = useMemo(
    () => filterAtlasDocuments(documents, filters),
    [documents, filters],
  );

  const collectionLabel = (collection: string | null) =>
    normalizeAtlasCollection(collection) || s('guild.atlas.collection.uncategorized');

  const documentMeta = selectedDoc ? [
    collectionLabel(selectedDoc.collection),
    selectedDoc.roster_name
      ? `${s(`guild.atlas.visibility.${selectedDoc.visibility_type}` as SemanticKey)} - ${selectedDoc.roster_name}`
      : s(`guild.atlas.visibility.${selectedDoc.visibility_type}` as SemanticKey),
    formatDate(selectedDoc.updated_at),
  ].filter(Boolean).join(' - ') : '';

  const openDocument = (doc: GuildAtlasDocument) => {
    const next = new URLSearchParams(searchParams);
    next.set('doc', doc.id);
    setSearchParams(next);
  };

  const openCreate = () => {
    navigate(`${atlasPath}/new`);
  };

  const openEdit = (doc: GuildAtlasDocument) => {
    navigate(`${atlasPath}/${doc.id}/edit`);
  };

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
      <PageContainer as="main" className="relative z-10 space-y-5 py-5 md:py-6" width="workspace">
        <PageHeader
          className="max-w-6xl flex-row items-center justify-between py-3 md:py-3"
          icon={Compass}
          title={s('guild.atlas.title')}
          bordered={false}
          actions={canManageAtlas ? (
            <Button size="sm" onClick={() => openCreate()} className="h-9 w-9 p-0 sm:w-auto sm:px-3">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{s('guild.atlas.new_doc')}</span>
            </Button>
          ) : null}
        />

        <section className="grid gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
          <GlowCard surface="section" hoverable={false}>
            <div className="mb-4 flex flex-col gap-3">
              <FilterBar className="mb-0 flex-nowrap">
                <FilterSearchField
                  value={filters.query}
                  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder={s('guild.atlas.search.placeholder')}
                  containerClassName="min-w-0 flex-1"
                />

                {canManageAtlas ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(filterControlClassName, 'shrink-0 gap-2')}
                        aria-label={s('guild.atlas.filter.label')}
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">{s('guild.atlas.filter.label')}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>{s('guild.atlas.editor.status')}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={filters.status}
                        onValueChange={(value) => setFilters((current) => ({
                          ...current,
                          status: value as AtlasFilters['status'],
                        }))}
                      >
                        <DropdownMenuRadioItem value="active">{s('guild.atlas.filter.active')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="published">{s('guild.atlas.status.published')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="draft">{s('guild.atlas.status.draft')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="archived">{s('guild.atlas.status.archived')}</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="all">{s('guild.atlas.filter.all_statuses')}</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>{s('guild.atlas.visibility.label')}</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={filters.visibility}
                        onValueChange={(value) => setFilters((current) => ({ ...current, visibility: value }))}
                      >
                        <DropdownMenuRadioItem value="all">{s('guild.atlas.filter.all_visibility')}</DropdownMenuRadioItem>
                        {visibilityOptions.map((visibility) => (
                          <DropdownMenuRadioItem key={visibility} value={visibility}>
                            {s(`guild.atlas.visibility.${visibility}` as SemanticKey)}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </FilterBar>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters((current) => ({ ...current, collection: 'all' }))}
                  className={cn(filterControlClassName, 'shrink-0', filters.collection === 'all' && activeFilterControlClassName)}
                >
                  {s('guild.atlas.filter.all_categories')}
                </Button>
                {hasUncategorized ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((current) => ({ ...current, collection: UNCATEGORIZED_COLLECTION }))}
                    className={cn(filterControlClassName, 'shrink-0', filters.collection === UNCATEGORIZED_COLLECTION && activeFilterControlClassName)}
                  >
                    {s('guild.atlas.collection.uncategorized')}
                  </Button>
                ) : null}
                {collections.map((collection) => (
                  <Button
                    key={collection}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((current) => ({ ...current, collection }))}
                    className={cn(filterControlClassName, 'shrink-0', filters.collection === collection && activeFilterControlClassName)}
                  >
                    {collection}
                  </Button>
                ))}
              </div>
            </div>

            {filteredDocs.length > 0 ? (
              <div className="space-y-2">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => openDocument(doc)}
                    className={cn(
                      'w-full rounded border border-border/35 bg-background/25 p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/10',
                      selectedDoc?.id === doc.id && 'border-primary/45 bg-primary/15',
                    )}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                        {doc.summary ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{doc.summary}</p>
                        ) : null}
                      </div>
                      {(canManageAtlas || doc.status !== 'published') ? (
                        <Badge variant="outline" className={cn('h-5 shrink-0 px-1.5 text-[10px]', statusTone[doc.status])}>
                          {s(`guild.atlas.status.${doc.status}` as SemanticKey)}
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : canManageAtlas && documents.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={s('guild.atlas.empty.officer_title')}
                description={s('guild.atlas.empty.officer_short')}
                action={(
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    {s('guild.atlas.new_doc')}
                  </Button>
                )}
              />
            ) : documents.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={s('guild.atlas.empty.member_title')}
                description={s('guild.atlas.empty.member_short')}
              />
            ) : (
              <EmptyState
                icon={Search}
                title={s('guild.atlas.empty.filtered_title')}
                description={s('guild.atlas.empty.filtered_description')}
              />
            )}
          </GlowCard>

          <GlowCard surface="section" hoverable={false} className="min-h-[560px]">
            {selectedDoc ? (
              <article className="space-y-5">
                <div className="flex flex-col gap-3 border-b border-border/35 pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    {canManageAtlas && selectedDoc.status !== 'published' ? (
                      <Badge variant="outline" className={cn('mb-2 border px-2', statusTone[selectedDoc.status])}>
                        {s(`guild.atlas.status.${selectedDoc.status}` as SemanticKey)}
                      </Badge>
                    ) : null}
                    <h2 className="text-xl font-medium tracking-normal text-foreground">{selectedDoc.title}</h2>
                    {selectedDoc.summary ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedDoc.summary}</p>
                    ) : null}
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{documentMeta}</p>
                  </div>
                  {canManageAtlas ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(selectedDoc)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        {s('guild.atlas.edit')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={mutating}
                            aria-label={s('guild.atlas.actions')}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {selectedDoc.status === 'draft' ? (
                            <DropdownMenuItem onClick={() => void publishDocument(selectedDoc)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              {t.common.publish}
                            </DropdownMenuItem>
                          ) : null}
                          {selectedDoc.status === 'published' ? (
                            <DropdownMenuItem onClick={() => void unpublishDocument(selectedDoc)}>
                              <Clock3 className="mr-2 h-4 w-4" />
                              {s('guild.atlas.unpublish')}
                            </DropdownMenuItem>
                          ) : null}
                          {selectedDoc.status === 'archived' ? (
                            <DropdownMenuItem onClick={() => void restoreDocument(selectedDoc)}>
                              <Undo2 className="mr-2 h-4 w-4" />
                              {s('guild.atlas.restore')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => void archiveDocument(selectedDoc)}>
                              <Archive className="mr-2 h-4 w-4" />
                              {s('guild.atlas.archive')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}
                </div>

                {selectedDoc.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDoc.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                ) : null}

                <MarkdownContent
                  content={selectedDoc.content}
                  emptyText={s('guild.atlas.empty_content')}
                />
              </article>
            ) : (
              <EmptyState
                icon={FileText}
                title={s('guild.atlas.reader.empty_title')}
                description={s('guild.atlas.reader.empty_description')}
                className="min-h-[500px]"
              />
            )}
          </GlowCard>
        </section>
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

export default GuildAtlas;
