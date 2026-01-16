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
import { MarkdownEditor } from '@/components/forum/MarkdownEditor';
import { toast } from 'sonner';
import { Save, FileText, Eye, Edit, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LegalPage {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  updated_at: string;
  updated_by: string | null;
}

const slugLabels: Record<string, { fr: string; en: string }> = {
  'legal-notice': { fr: 'Mentions légales', en: 'Legal Notice' },
  'privacy-policy': { fr: 'Politique de confidentialité', en: 'Privacy Policy' },
  'terms-of-service': { fr: 'CGU', en: 'Terms of Service' },
};

export const LegalPagesEditor = () => {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [editLang, setEditLang] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from('legal_pages')
      .select('*')
      .order('slug');

    if (error) {
      console.error('Error fetching legal pages:', error);
      toast.error(t.errors.generic);
      return;
    }

    setPages(data || []);
    setLoading(false);
  };

  const handleEdit = (page: LegalPage) => {
    setEditingPage({ ...page });
    setPreviewMode(false);
  };

  const handleSave = async () => {
    if (!editingPage || !user) return;

    setSaving(editingPage.id);

    const { error } = await supabase
      .from('legal_pages')
      .update({
        title_fr: editingPage.title_fr,
        title_en: editingPage.title_en,
        content_fr: editingPage.content_fr,
        content_en: editingPage.content_en,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', editingPage.id);

    setSaving(null);

    if (error) {
      console.error('Error saving legal page:', error);
      toast.error(t.errors.generic, {
        style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--destructive) / 0.3)' },
      });
      return;
    }

    toast.success(language === 'fr' ? 'Page enregistrée' : 'Page saved', {
      style: { background: 'hsl(var(--card))', borderColor: 'hsl(var(--primary) / 0.3)' },
    });

    fetchPages();
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
          <GlowCard key={i} className="p-4">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (editingPage) {
    const currentTitle = editLang === 'fr' ? editingPage.title_fr : editingPage.title_en;
    const currentContent = editLang === 'fr' ? editingPage.content_fr : editingPage.content_en;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">
            {slugLabels[editingPage.slug]?.[language] || editingPage.slug}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-1.5"
            >
              {previewMode ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {previewMode ? (language === 'fr' ? 'Éditer' : 'Edit') : (language === 'fr' ? 'Aperçu' : 'Preview')}
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

        <Tabs value={editLang} onValueChange={(v) => setEditLang(v as 'fr' | 'en')}>
          <TabsList className="bg-card/50">
            <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
            <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
          </TabsList>

          <TabsContent value={editLang} className="mt-4 space-y-4">
            {previewMode ? (
              <GlowCard className="p-6">
                <h1 className="font-display text-2xl text-foreground mb-4">{currentTitle}</h1>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-medium text-foreground mt-4 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-muted-foreground mb-3 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-muted-foreground mb-3 space-y-1">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-muted-foreground">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-foreground font-medium">{children}</strong>
                      ),
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
                    {currentContent}
                  </ReactMarkdown>
                </div>
              </GlowCard>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`title-${editLang}`}>
                    {language === 'fr' ? 'Titre' : 'Title'} ({editLang.toUpperCase()})
                  </Label>
                  <Input
                    id={`title-${editLang}`}
                    value={currentTitle}
                    onChange={(e) => {
                      setEditingPage({
                        ...editingPage,
                        [editLang === 'fr' ? 'title_fr' : 'title_en']: e.target.value,
                      });
                    }}
                    className="bg-card"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {language === 'fr' ? 'Contenu' : 'Content'} ({editLang.toUpperCase()})
                  </Label>
                  <MarkdownEditor
                    value={currentContent}
                    onChange={(value) => {
                      setEditingPage({
                        ...editingPage,
                        [editLang === 'fr' ? 'content_fr' : 'content_en']: value,
                      });
                    }}
                    placeholder={language === 'fr' ? 'Contenu en Markdown...' : 'Content in Markdown...'}
                    minHeight="300px"
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">
        {language === 'fr'
          ? 'Gérez les pages légales obligatoires de votre site. Le contenu est affiché en Markdown.'
          : 'Manage the mandatory legal pages of your site. Content is displayed in Markdown.'}
      </p>

      {pages.map((page) => {
        const label = slugLabels[page.slug]?.[language] || page.slug;
        const updatedAt = new Date(page.updated_at).toLocaleDateString(
          language === 'fr' ? 'fr-FR' : 'en-US',
          { dateStyle: 'medium' }
        );

        return (
          <GlowCard key={page.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{label}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t.legal.lastUpdated}: {updatedAt}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(page)} className="gap-1.5">
                <Edit className="h-4 w-4" />
                {language === 'fr' ? 'Modifier' : 'Edit'}
              </Button>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
};
