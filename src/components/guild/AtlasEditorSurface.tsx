import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { GuildAtlasDocumentInput, GuildAtlasRosterOption } from '@/hooks/useGuildAtlas';
import type { SemanticKey } from '@/i18n/semantic';
import type { AtlasDocStatus, AtlasVisibilityType } from '@/lib/guildAtlas';

import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';
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
import { resolveSemanticMessage } from '@/i18n/semantic';
import { normalizeAtlasCollection, normalizeAtlasTags } from '@/lib/guildAtlas';

interface AtlasEditorSurfaceProps {
  resetKey: string;
  isEditing: boolean;
  initialData: GuildAtlasDocumentInput;
  selectedStatus: AtlasDocStatus;
  selectedDocumentStatus?: AtlasDocStatus | null;
  rosters: GuildAtlasRosterOption[];
  mutating: boolean;
  onBack: () => void;
  onSave: (input: GuildAtlasDocumentInput, redirectAfterSave: boolean) => void | Promise<void>;
  onPublish: (input: GuildAtlasDocumentInput) => void | Promise<void>;
  onUnpublish?: () => void | Promise<void>;
  onArchive?: () => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  uploadImage: (file: File) => Promise<string>;
}

const ATLAS_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const visibilityOptions: AtlasVisibilityType[] = ['members', 'officers', 'rank', 'roster'];
const statusOptions: AtlasDocStatus[] = ['draft', 'published', 'archived'];

const buildInput = (form: GuildAtlasDocumentInput, tagText: string, statusOverride?: AtlasDocStatus): GuildAtlasDocumentInput => ({
  ...form,
  title: form.title.trim(),
  summary: form.summary?.trim() || null,
  collection: normalizeAtlasCollection(form.collection),
  tags: normalizeAtlasTags(tagText),
  status: statusOverride || form.status,
  min_rank_index: form.visibility_type === 'rank' ? form.min_rank_index : null,
  roster_id: form.visibility_type === 'roster' ? form.roster_id : null,
});

export const AtlasEditorSurface = ({
  resetKey,
  isEditing,
  initialData,
  selectedStatus,
  selectedDocumentStatus,
  rosters,
  mutating,
  onBack,
  onSave,
  onPublish,
  onUnpublish,
  onArchive,
  onRestore,
  uploadImage,
}: AtlasEditorSurfaceProps) => {
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language, translations: t, fallback });
  const [form, setForm] = useState<GuildAtlasDocumentInput>(initialData);
  const [tagText, setTagText] = useState(initialData.tags.join(', '));

  useEffect(() => {
    setForm(initialData);
    setTagText(initialData.tags.join(', '));
  }, [initialData, resetKey]);

  const handleVisibilityChange = (value: AtlasVisibilityType) => {
    setForm((current) => ({
      ...current,
      visibility_type: value,
      min_rank_index: value === 'rank' ? current.min_rank_index ?? 2 : null,
      roster_id: value === 'roster' ? current.roster_id : null,
    }));
  };

  const handleUploadImage = async (file: File) => {
    if (file.size > ATLAS_IMAGE_MAX_SIZE) {
      throw new Error('Image is too large');
    }

    return uploadImage(file);
  };

  const saveDisabled = !form.title.trim()
    || mutating
    || (form.visibility_type === 'roster' && !form.roster_id);

  return (
    <PageContainer as="main" className="relative z-10 space-y-5 py-5 md:py-6" width="workspace">
      <PageHeader
        icon={Compass}
        title={isEditing ? s('guild.atlas.editor.edit_title') : s('guild.atlas.editor.new_title')}
        description={s('guild.atlas.editor.description')}
        bordered={false}
        meta={(
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {s(`guild.atlas.status.${selectedStatus}` as SemanticKey)}
          </Badge>
        )}
        actions={(
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {s('guild.atlas.editor.back_to_library')}
          </Button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.42fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <GlowCard surface="section" hoverable={false} className="space-y-4">
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
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as AtlasDocStatus }))}>
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

            <div className="border-t border-border/35 pt-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
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

        <GlowCard surface="section" hoverable={false} className="space-y-3">
          <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="atlas-content">{s('guild.atlas.editor.content')}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{s('guild.atlas.editor.content_hint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedDocumentStatus === 'published' && onUnpublish ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void Promise.resolve(onUnpublish()).then(() => setForm((current) => ({ ...current, status: 'draft' })));
                  }}
                  disabled={mutating}
                >
                  {s('guild.atlas.unpublish')}
                </Button>
              ) : null}
              {selectedDocumentStatus === 'archived' && onRestore ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void Promise.resolve(onRestore()).then(() => setForm((current) => ({ ...current, status: 'draft' })));
                  }}
                  disabled={mutating}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {s('guild.atlas.restore')}
                </Button>
              ) : selectedDocumentStatus && onArchive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void Promise.resolve(onArchive()).then(() => setForm((current) => ({ ...current, status: 'archived' })));
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
            visual
            imageTools={{
              uploadImage: handleUploadImage,
              maxSizeBytes: ATLAS_IMAGE_MAX_SIZE,
            }}
          />

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {s('guild.atlas.editor.back_to_library')}
            </Button>
            <Button
              variant="outline"
              onClick={() => void onSave(buildInput(form, tagText), false)}
              disabled={saveDisabled}
            >
              {t.common.save}
            </Button>
            <Button
              onClick={() => void onPublish(buildInput(form, tagText, 'published'))}
              disabled={saveDisabled}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {form.status === 'published' ? t.common.save : t.common.publish}
            </Button>
          </div>
        </GlowCard>
      </div>
    </PageContainer>
  );
};
