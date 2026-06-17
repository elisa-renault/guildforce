import {
  Calendar,
  CheckCircle,
  Edit,
  Eye,
  FileEdit,
  Loader2,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';
import { GlowCard } from '@/components/GlowCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { isSupportedLanguage, LANGUAGE_OPTIONS, type Language } from '@/i18n/config';
import { formatDateLocalized } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import {
  collectPersistedTranslations,
  isTranslationMissingOrUntranslated,
  selectContentTranslation,
  toEditableTranslationMap,
  type EditableContentTranslationMap,
} from '@/lib/contentTranslations';


interface PatchNoteTranslation {
  id?: string;
  language: string;
  title: string;
  content: string;
}

interface PatchNote {
  id: string;
  version: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  patch_note_translations: PatchNoteTranslation[];
}

interface EditablePatchNote {
  id: string;
  version: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  translations: EditableContentTranslationMap;
}

const getLanguageLabel = (language: Language): string =>
  LANGUAGE_OPTIONS.find((option) => option.code === language)?.label || language;

const hasGermanTranslation = (translations: PatchNoteTranslation[]): boolean =>
  !isTranslationMissingOrUntranslated(translations, 'de');

export const PatchNotesEditor = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<EditablePatchNote | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editLang, setEditLang] = useState<Language>('en');
  const [isNew, setIsNew] = useState(false);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const getPatchPlaceholder = (field: 'title' | 'content') => {
    const key = `admin.patch.${field}_placeholder.en` as Parameters<
      typeof resolveSemanticMessage
    >[0]['key'];
    return resolveSemanticMessage({ key, language: 'en', translations: t });
  };

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('patch_notes')
      .select('id, version, status, published_at, created_at, updated_at, created_by, patch_note_translations(id, language, title, content)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(t.errors.generic);
      return;
    }

    setNotes((data as PatchNote[]) || []);
    setLoading(false);
  }, [t.errors.generic]);

  useEffect(() => {
    void fetchNotes();
  }, [fetchNotes]);

  const handleNew = () => {
    const versions = notes.map((note) => note.version).filter((value) => /^\d+\.\d+\.\d+$/.test(value));
    let nextVersion = '0.1.0';

    if (versions.length > 0) {
      const sorted = versions.sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
        const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
        if (aMajor !== bMajor) return bMajor - aMajor;
        if (aMinor !== bMinor) return bMinor - aMinor;
        return bPatch - aPatch;
      });
      const [major, minor, patch] = sorted[0].split('.').map(Number);
      nextVersion = `${major}.${minor}.${patch + 1}`;
    }

    setEditingNote({
      id: '',
      version: nextVersion,
      status: 'draft',
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user?.id || null,
      translations: toEditableTranslationMap([]),
    });
    setIsNew(true);
    setPreviewMode(false);
    setEditLang(language);
  };

  const handleEdit = (note: PatchNote) => {
    setEditingNote({
      id: note.id,
      version: note.version,
      status: note.status,
      published_at: note.published_at,
      created_at: note.created_at,
      updated_at: note.updated_at,
      created_by: note.created_by,
      translations: toEditableTranslationMap(note.patch_note_translations || []),
    });
    setIsNew(false);
    setPreviewMode(false);
    setEditLang(language);
  };

  const handleSave = async () => {
    if (!editingNote || !user) return;

    if (!/^\d+\.\d+\.\d+$/.test(editingNote.version)) {
      toast.error(t.patchnotes.versionFormat, {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    const translationRows = collectPersistedTranslations(editingNote.translations, ['en']);
    const hasEnglishTitle = translationRows.some((row) => row.language === 'en' && row.title.length > 0);

    if (!hasEnglishTitle) {
      toast.error(t.errors.generic, {
        description: sm('admin.patch.required_en_title'),
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    setSaving(true);

    const publishedAt = editingNote.status === 'published'
      ? editingNote.published_at || new Date().toISOString()
      : null;

    let targetNoteId = editingNote.id;

    if (isNew) {
      const { data, error } = await supabase
        .from('patch_notes')
        .insert({
          version: editingNote.version,
          status: editingNote.status,
          published_at: publishedAt,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error || !data) {
        setSaving(false);

        if (error?.code === '23505') {
          toast.error(t.patchnotes.versionExists, {
            style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
          });
        } else {
          toast.error(t.errors.generic, {
            style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
          });
        }
        return;
      }

      targetNoteId = data.id;
    } else {
      const { error } = await supabase
        .from('patch_notes')
        .update({
          version: editingNote.version,
          status: editingNote.status,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNote.id);

      if (error) {
        setSaving(false);
        toast.error(t.errors.generic, {
          style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
        });
        return;
      }
    }

    const { error: translationError } = await supabase
      .from('patch_note_translations')
      .upsert(
        translationRows.map((row) => ({
          patch_note_id: targetNoteId,
          language: row.language,
          title: row.title,
          content: row.content,
        })),
        { onConflict: 'patch_note_id,language' },
      );

    setSaving(false);

    if (translationError) {
      toast.error(t.errors.generic, {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    toast.success(t.patchnotes.saved, {
      style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
    });

    void fetchNotes();
    setEditingNote(null);
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('patch_notes').delete().eq('id', id);

    if (error) {
      toast.error(t.errors.generic);
      return;
    }

    toast.success(t.patchnotes.deleted, {
      style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
    });

    void fetchNotes();
  };

  const handleCancel = () => {
    setEditingNote(null);
    setIsNew(false);
    setPreviewMode(false);
  };

  const togglePublish = () => {
    if (!editingNote) return;
    setEditingNote({
      ...editingNote,
      status: editingNote.status === 'draft' ? 'published' : 'draft',
      published_at: editingNote.status === 'draft' ? new Date().toISOString() : null,
    });
  };

  const isRecent = (date: string | null) => {
    if (!date) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(date) > sevenDaysAgo;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <GlowCard key={i} surface="section" className="p-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (editingNote) {
    const currentTranslation = editingNote.translations[editLang];
    const titlePlaceholder = getPatchPlaceholder('title');
    const contentPlaceholder = getPatchPlaceholder('content');
    const emptyPreview = '*No content*';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg font-medium text-foreground">
            {isNew ? t.patchnotes.newVersion : `v${editingNote.version}`}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-1.5"
            >
              {previewMode ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewMode ? t.common.edit : t.patchnotes.preview}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              {t.common.cancel}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t.common.save}
            </Button>
          </div>
        </div>

        <GlowCard surface="section" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">{t.patchnotes.version}</Label>
              <Input
                id="version"
                name="version"
                value={editingNote.version}
                onChange={(event) => setEditingNote({ ...editingNote, version: event.target.value })}
                placeholder={sm('admin.patch.version_placeholder')}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t.patchnotes.versionFormat}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.patchnotes.status}</Label>
              <div>
                <Button
                  type="button"
                  variant={editingNote.status === 'published' ? 'default' : 'outline'}
                  size="sm"
                  onClick={togglePublish}
                  className="gap-1.5"
                >
                  {editingNote.status === 'published' ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {t.patchnotes.published}
                    </>
                  ) : (
                    <>
                      <FileEdit className="h-4 w-4" />
                      {t.patchnotes.draft}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>{t.auth.language}</Label>
            <Select
              value={editLang}
              onValueChange={(value) => {
                if (isSupportedLanguage(value)) {
                  setEditLang(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`title-${editLang}`}>
              {t.patchnotes.title} ({getLanguageLabel(editLang)})
            </Label>
            <Input
              id={`title-${editLang}`}
              value={currentTranslation.title}
              onChange={(event) => {
                const title = event.target.value;
                setEditingNote((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    translations: {
                      ...prev.translations,
                      [editLang]: {
                        ...prev.translations[editLang],
                        title,
                        exists: true,
                      },
                    },
                  };
                });
              }}
              placeholder={titlePlaceholder}
            />
          </div>

          {previewMode ? (
            <div className="prose prose-invert max-w-none p-4 bg-background/50 rounded-lg border border-border/50">
              <ReactMarkdown>{currentTranslation.content || emptyPreview}</ReactMarkdown>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>
                {t.patchnotes.content} ({getLanguageLabel(editLang)})
              </Label>
              <MarkdownEditor
                value={currentTranslation.content}
                onChange={(content) => {
                  setEditingNote((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      translations: {
                        ...prev.translations,
                        [editLang]: {
                          ...prev.translations[editLang],
                          content,
                          exists: true,
                        },
                      },
                    };
                  });
                }}
                placeholder={contentPlaceholder}
              />
            </div>
          )}
        </GlowCard>
      </div>
    );
  }

  const publishedCount = notes.filter((note) => note.status === 'published').length;
  const draftCount = notes.filter((note) => note.status === 'draft').length;
  const missingDeCount = notes.filter((note) => !hasGermanTranslation(note.patch_note_translations || [])).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-status-success" />
            {publishedCount} {t.patchnotes.published.toLowerCase()}
          </span>
          <span className="flex items-center gap-1.5">
            <FileEdit className="h-4 w-4 text-status-warning" />
            {draftCount} {t.patchnotes.draft.toLowerCase()}
          </span>
          <span className="flex items-center gap-1.5">
            <ScrollText className="h-4 w-4 text-status-warning" />
            DE missing: {missingDeCount}
          </span>
        </div>
        <Button size="sm" onClick={handleNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t.patchnotes.newVersion}
        </Button>
      </div>

      {notes.length === 0 ? (
        <GlowCard surface="section" className="text-center">
          <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t.patchnotes.noNotes}</p>
          <Button size="sm" onClick={handleNew} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            {t.patchnotes.newVersion}
          </Button>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const localized = selectContentTranslation(note.patch_note_translations ?? [], language);
            const missingDe = !hasGermanTranslation(note.patch_note_translations || []);
            return (
              <GlowCard
                surface="section"
                key={note.id}
                className="p-4 hover:bg-card/60 transition-colors cursor-pointer"
                onClick={() => handleEdit(note)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-semibold text-foreground">v{note.version}</span>
                      <Badge
                        variant={note.status === 'published' ? 'default' : 'secondary'}
                        className={note.status === 'published' ? 'bg-status-success/20 text-status-success border-status-success/30' : ''}
                      >
                        {note.status === 'published' ? t.patchnotes.published : t.patchnotes.draft}
                      </Badge>
                      {missingDe ? (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          DE missing
                        </Badge>
                      ) : null}
                      {note.status === 'published' && isRecent(note.published_at) && (
                        <Badge className="bg-primary/20 text-primary border-primary/30">{t.common.new}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground truncate">{localized.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {note.published_at
                        ? `${t.patchnotes.publishedAt} ${formatDateLocalized(note.published_at, language, { dateStyle: 'medium' })}`
                        : formatDateLocalized(note.created_at, language, { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(note)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-status-error hover:text-status-error">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.patchnotes.confirmDelete}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.patchnotes.confirmDeleteDesc} v{note.version}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(note.id)}>
                            {t.common.delete}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
