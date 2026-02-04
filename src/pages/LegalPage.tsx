import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { selectContentTranslation } from '@/lib/contentTranslations';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDateLocalized } from '@/i18n/format';

interface LegalPageData {
  id: string;
  slug: string;
  legal_page_translations: Array<{
    language: string;
    title: string;
    content: string;
  }>;
  updated_at: string;
}

const pathToSlugMap: Record<string, string> = {
  '/legal': 'legal-notice',
  '/privacy': 'privacy-policy',
  '/terms': 'terms-of-service',
};

const LegalPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    const fetchPage = async () => {
      const dbSlug = pathToSlugMap[location.pathname] || 'legal-notice';
      
      const { data, error } = await supabase
        .from('legal_pages')
        .select('id, slug, updated_at, legal_page_translations(language, title, content)')
        .eq('slug', dbSlug)
        .single();

      if (error) {
        navigate('/');
        return;
      }

      setPage(data);
      setLoading(false);
    };

    fetchPage();
  }, [location.pathname, navigate]);

  const localized = page
    ? selectContentTranslation(page.legal_page_translations ?? [], language)
    : { title: '', content: '' };
  const title = localized.title;
  const content = localized.content;
  const updatedAt = page?.updated_at
    ? formatDateLocalized(page.updated_at, language)
    : '';

  return (
    <div className="flex-1 flex flex-col pt-16 relative">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 flex-1">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.back}
          </Button>

          {loading ? (
            <GlowCard className="p-6">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </GlowCard>
          ) : (
            <GlowCard className="p-6 md:p-8">
              <h1 className="font-display text-2xl md:text-3xl text-foreground mb-2">
                {title}
              </h1>
              <p className="text-xs text-muted-foreground mb-6">
                {t.legal.lastUpdated}: {updatedAt}
              </p>

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
                  {content}
                </ReactMarkdown>
              </div>
            </GlowCard>
          )}
        </div>
      </main>
    </div>
  );
};

export default LegalPage;
