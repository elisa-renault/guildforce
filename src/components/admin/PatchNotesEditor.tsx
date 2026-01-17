import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MarkdownEditor } from '@/components/forum/MarkdownEditor';
import { toast } from 'sonner';
import { 
  Save, Eye, Edit, Loader2, Plus, Trash2, ScrollText, 
  Calendar, CheckCircle, FileEdit 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

interface PatchNote {
  id: string;
  version: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const PatchNotesEditor = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<PatchNote | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editLang, setEditLang] = useState<'fr' | 'en'>('fr');
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('patch_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(t.errors.generic);
      return;
    }

    setNotes((data as PatchNote[]) || []);
    setLoading(false);
  };

  const handleNew = () => {
    // Generate next version number
    const versions = notes.map(n => n.version).filter(v => /^\d+\.\d+\.\d+$/.test(v));
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
      title_fr: '',
      title_en: '',
      content_fr: '',
      content_en: '',
      status: 'draft',
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user?.id || null,
    });
    setIsNew(true);
    setPreviewMode(false);
  };

  const handleEdit = (note: PatchNote) => {
    setEditingNote({ ...note });
    setIsNew(false);
    setPreviewMode(false);
  };

  const handleSave = async () => {
    if (!editingNote || !user) return;

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(editingNote.version)) {
      toast.error(t.patchnotes.versionFormat, {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    setSaving(true);

    if (isNew) {
      const { error } = await supabase
        .from('patch_notes')
        .insert({
          version: editingNote.version,
          title_fr: editingNote.title_fr,
          title_en: editingNote.title_en,
          content_fr: editingNote.content_fr,
          content_en: editingNote.content_en,
          status: editingNote.status,
          published_at: editingNote.status === 'published' ? new Date().toISOString() : null,
          created_by: user.id,
        });

      setSaving(false);

      if (error) {
        if (error.code === '23505') {
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
    } else {
      const { error } = await supabase
        .from('patch_notes')
        .update({
          version: editingNote.version,
          title_fr: editingNote.title_fr,
          title_en: editingNote.title_en,
          content_fr: editingNote.content_fr,
          content_en: editingNote.content_en,
          status: editingNote.status,
          published_at: editingNote.status === 'published' && !editingNote.published_at 
            ? new Date().toISOString() 
            : editingNote.published_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNote.id);

      setSaving(false);

      if (error) {
        toast.error(t.errors.generic, {
          style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
        });
        return;
      }
    }

    toast.success(t.patchnotes.saved, {
      style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
    });

    fetchNotes();
    setEditingNote(null);
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('patch_notes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(t.errors.generic);
      return;
    }

    toast.success(t.patchnotes.deleted, {
      style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
    });

    fetchNotes();
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
          <GlowCard key={i} className="p-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (editingNote) {
    const currentTitle = editLang === 'fr' ? editingNote.title_fr : editingNote.title_en;
    const currentContent = editLang === 'fr' ? editingNote.content_fr : editingNote.content_en;

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

        <GlowCard className="p-4 space-y-4">
          {/* Version and status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">{t.patchnotes.version}</Label>
              <Input
                id="version"
                name="version"
                value={editingNote.version}
                onChange={(e) => setEditingNote({ ...editingNote, version: e.target.value })}
                placeholder="1.0.0"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">{t.patchnotes.versionFormat}</p>
            </div>
            <div className="space-y-2">
              <Label>{t.patchnotes.status}</Label>
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

          {/* Language tabs */}
          <Tabs value={editLang} onValueChange={(v) => setEditLang(v as 'fr' | 'en')}>
            <TabsList className="mb-4">
              <TabsTrigger value="fr">Français</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
            </TabsList>

            <TabsContent value="fr" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title_fr">{t.patchnotes.title}</Label>
                <Input
                  id="title_fr"
                  name="title_fr"
                  value={editingNote.title_fr}
                  onChange={(e) => setEditingNote({ ...editingNote, title_fr: e.target.value })}
                  placeholder="Titre de la version"
                />
              </div>
              {previewMode ? (
                <div className="prose prose-invert max-w-none p-4 bg-background/50 rounded-lg border border-border/50">
                  <ReactMarkdown>{editingNote.content_fr || '*Aucun contenu*'}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t.patchnotes.content}</Label>
                  <MarkdownEditor
                    value={editingNote.content_fr}
                    onChange={(v) => setEditingNote({ ...editingNote, content_fr: v })}
                    placeholder="Décrivez les changements..."
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="en" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title_en">{t.patchnotes.title}</Label>
                <Input
                  id="title_en"
                  name="title_en"
                  value={editingNote.title_en}
                  onChange={(e) => setEditingNote({ ...editingNote, title_en: e.target.value })}
                  placeholder="Version title"
                />
              </div>
              {previewMode ? (
                <div className="prose prose-invert max-w-none p-4 bg-background/50 rounded-lg border border-border/50">
                  <ReactMarkdown>{editingNote.content_en || '*No content*'}</ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t.patchnotes.content}</Label>
                  <MarkdownEditor
                    value={editingNote.content_en}
                    onChange={(v) => setEditingNote({ ...editingNote, content_en: v })}
                    placeholder="Describe the changes..."
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </GlowCard>
      </div>
    );
  }

  // List view
  const publishedCount = notes.filter(n => n.status === 'published').length;
  const draftCount = notes.filter(n => n.status === 'draft').length;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {publishedCount} {t.patchnotes.published.toLowerCase()}
          </span>
          <span className="flex items-center gap-1.5">
            <FileEdit className="h-4 w-4 text-yellow-500" />
            {draftCount} {t.patchnotes.draft.toLowerCase()}
          </span>
        </div>
        <Button size="sm" onClick={handleNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t.patchnotes.newVersion}
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <GlowCard className="p-6 text-center">
          <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t.patchnotes.noNotes}</p>
          <Button size="sm" onClick={handleNew} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            {t.patchnotes.newVersion}
          </Button>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <GlowCard
              key={note.id}
              className="p-4 hover:bg-card/60 transition-colors cursor-pointer"
              onClick={() => handleEdit(note)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono font-semibold text-foreground">
                      v{note.version}
                    </span>
                    <Badge 
                      variant={note.status === 'published' ? 'default' : 'secondary'}
                      className={note.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                    >
                      {note.status === 'published' ? t.patchnotes.published : t.patchnotes.draft}
                    </Badge>
                    {note.status === 'published' && isRecent(note.published_at) && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {t.common.new}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground truncate">
                    {language === 'fr' ? note.title_fr : note.title_en}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {note.published_at 
                      ? `${t.patchnotes.publishedAt} ${new Date(note.published_at).toLocaleDateString(language)}`
                      : new Date(note.created_at).toLocaleDateString(language)
                    }
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(note)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
          ))}
        </div>
      )}
    </div>
  );
};
