import { Edit, Eye, FileText, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/components/ui/sonner';

import { GlowCard } from '@/components/GlowCard';
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateLocalized } from '@/i18n/format';
import { supabase } from '@/integrations/supabase/client';
import {
  toEditableTranslationMap,
  type EditableContentTranslationMap,
} from '@/lib/contentTranslations';


interface LegalPageTranslation {
  id?: string;
  language: string;
  title: string;
  content: string;
}

interface LegalPage {
  id: string;
  slug: string;
  updated_at: string;
  updated_by: string | null;
  legal_page_translations: LegalPageTranslation[];
}

interface EditableLegalPage {
  id: string;
  slug: string;
  updated_at: string;
  updated_by: string | null;
  translations: EditableContentTranslationMap;
}

const slugLabels: Record<string, string> = {
  'legal-notice': 'Legal Notice',
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
};

const getSlugLabel = (slug: string) => {
  const label = slugLabels[slug];
  if (!label) return slug;
  return label;
};

const getEnglishTranslation = (translations: LegalPageTranslation[]) =>
  translations.find((translation) => translation.language === 'en') || {
    language: 'en',
    title: '',
    content: '',
  };

export const LegalPagesEditor = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<EditableLegalPage | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchPages = useCallback(async () => {
    const { data, error } = await supabase
      .from('legal_pages')
      .select('id, slug, updated_at, updated_by, legal_page_translations(id, language, title, content)')
      .order('slug');

    if (error) {
      toast.error('Something went wrong.');
      return;
    }

    setPages((data as LegalPage[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchPages();
  }, [fetchPages]);

  const handleEdit = (page: LegalPage) => {
    setEditingPage({
      id: page.id,
      slug: page.slug,
      updated_at: page.updated_at,
      updated_by: page.updated_by,
      translations: toEditableTranslationMap(page.legal_page_translations || []),
    });
    setPreviewMode(false);
  };

  const handleSave = async () => {
    if (!editingPage || !user) return;

    const englishTranslation = editingPage.translations.en;

    if (!englishTranslation.title.trim() || !englishTranslation.content.trim()) {
      toast.error('Something went wrong.', {
        description: 'English title and content are required.',
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    setSaving(editingPage.id);

    const { error: translationError } = await supabase
      .from('legal_page_translations')
      .upsert(
        [{
          legal_page_id: editingPage.id,
          language: 'en',
          title: englishTranslation.title.trim(),
          content: englishTranslation.content,
        }],
        { onConflict: 'legal_page_id,language' },
      );

    if (translationError) {
      setSaving(null);
      toast.error('Something went wrong.', {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    const { error: pageError } = await supabase
      .from('legal_pages')
      .update({
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', editingPage.id);

    setSaving(null);

    if (pageError) {
      toast.error('Something went wrong.', {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    toast.success('Legal page saved', {
      style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
    });

    void fetchPages();
    setEditingPage(null);
  };

  const handleCancel = () => {
    setEditingPage(null);
    setPreviewMode(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <GlowCard key={i} surface="section" className="p-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (editingPage) {
    const currentTranslation = editingPage.translations.en;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">{getSlugLabel(editingPage.slug)}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-1.5"
            >
              {previewMode ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving === editingPage.id}
              className="gap-1.5"
            >
              {saving === editingPage.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        {previewMode ? (
          <GlowCard surface="section">
            <h1 className="font-sans text-2xl font-medium text-foreground mb-4">{currentTranslation.title}</h1>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-lg font-medium text-foreground mt-6 mb-3 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-medium text-foreground mt-4 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => <p className="text-muted-foreground mb-3 leading-relaxed">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1">{children}</ul>
                  ),
                  li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                  strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {currentTranslation.content}
              </ReactMarkdown>
            </div>
          </GlowCard>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="title-en">Title (English)</Label>
              <Input
                id="title-en"
                value={currentTranslation.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setEditingPage((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      translations: {
                        ...prev.translations,
                        en: {
                          ...prev.translations.en,
                          title,
                          exists: true,
                        },
                      },
                    };
                  });
                }}
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>Content (English)</Label>
              <MarkdownEditor
                value={currentTranslation.content}
                onChange={(content) => {
                  setEditingPage((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      translations: {
                        ...prev.translations,
                        en: {
                          ...prev.translations.en,
                          content,
                          exists: true,
                        },
                      },
                    };
                  });
                }}
                placeholder="Markdown content..."
                minHeight="300px"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 mb-4">
        <p className="text-sm text-muted-foreground">
          Manage the public legal pages. Only English content is shown and edited.
        </p>
      </div>

      {pages.map((page) => {
        const label = getSlugLabel(page.slug);
        const updatedAt = formatDateLocalized(page.updated_at, 'en', {
          dateStyle: 'medium',
        });
        const english = getEnglishTranslation(page.legal_page_translations ?? []);

        return (
          <GlowCard key={page.id} surface="section" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{label}</h4>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      EN only
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{english.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {updatedAt}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(page)} className="gap-1.5">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
};
