import { Edit, Eye, FileText, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { MarkdownEditor } from '@/components/markdown/MarkdownEditor';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FALLBACK_LANGUAGE, isSupportedLanguage, LANGUAGE_OPTIONS, type Language } from '@/i18n/config';
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

const hasGermanTranslation = (translations: LegalPageTranslation[]): boolean =>
  !isTranslationMissingOrUntranslated(translations, 'de');

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

const getLanguageLabel = (language: Language): string =>
  LANGUAGE_OPTIONS.find((option) => option.code === language)?.label || language;

export const LegalPagesEditor = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<EditableLegalPage | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editLang, setEditLang] = useState<Language>('en');
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  const fetchPages = useCallback(async () => {
    const { data, error } = await supabase
      .from('legal_pages')
      .select('id, slug, updated_at, updated_by, legal_page_translations(id, language, title, content)')
      .order('slug');

    if (error) {
      toast.error(t.errors.generic);
      return;
    }

    setPages((data as LegalPage[]) || []);
    setLoading(false);
  }, [t.errors.generic]);

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
    setEditLang(language);
  };

  const handleSave = async () => {
    if (!editingPage || !user) return;

    const translationRows = collectPersistedTranslations(editingPage.translations, [FALLBACK_LANGUAGE]);

    const hasFallbackLanguage =
      translationRows.some(
        (row) => row.language === FALLBACK_LANGUAGE && row.title.length > 0 && row.content.length > 0,
      );

    if (!hasFallbackLanguage) {
      toast.error(t.errors.generic, {
        description: sm('admin.legal.required_en_fr'),
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    setSaving(editingPage.id);

    const { error: translationError } = await supabase
      .from('legal_page_translations')
      .upsert(
        translationRows.map((row) => ({
          legal_page_id: editingPage.id,
          language: row.language,
          title: row.title,
          content: row.content,
        })),
        { onConflict: 'legal_page_id,language' },
      );

    if (translationError) {
      setSaving(null);
      toast.error(t.errors.generic, {
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
      toast.error(t.errors.generic, {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    toast.success(sm('admin.legal.saved'), {
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
    const currentTranslation = editingPage.translations[editLang];

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
              {previewMode ? sm('admin.legal.toggle_edit') : sm('admin.legal.toggle_preview')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              {t.common.cancel}
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
              {t.common.save}
            </Button>
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
              <Label htmlFor={`title-${editLang}`}>
                {sm('admin.legal.field_title')} ({getLanguageLabel(editLang)})
              </Label>
              <Input
                id={`title-${editLang}`}
                value={currentTranslation.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setEditingPage((prev) => {
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
                className="bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label>
                {sm('admin.legal.field_content')} ({getLanguageLabel(editLang)})
              </Label>
              <MarkdownEditor
                value={currentTranslation.content}
                onChange={(content) => {
                  setEditingPage((prev) => {
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
                placeholder={sm('admin.legal.markdown_placeholder')}
                minHeight="300px"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  const missingDeCount = pages.filter((page) => !hasGermanTranslation(page.legal_page_translations || [])).length;

  return (
    <div className="space-y-4">
      <div className="space-y-1 mb-4">
        <p className="text-sm text-muted-foreground">{sm('admin.legal.list_help')}</p>
        <p className="text-xs text-muted-foreground">
          DE missing: {missingDeCount}/{pages.length}
        </p>
      </div>

      {pages.map((page) => {
        const label = getSlugLabel(page.slug);
        const updatedAt = formatDateLocalized(page.updated_at, language, {
          dateStyle: 'medium',
        });
        const localized = selectContentTranslation(page.legal_page_translations ?? [], language);
        const missingDe = !hasGermanTranslation(page.legal_page_translations || []);

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
                    {missingDe ? (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        DE missing
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{localized.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.legal.lastUpdated}: {updatedAt}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(page)} className="gap-1.5">
                <Edit className="h-4 w-4" />
                {sm('admin.legal.edit_action')}
              </Button>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
};
