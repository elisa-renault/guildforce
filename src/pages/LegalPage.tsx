import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LegalPageData {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
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
    const fetchPage = async () => {
      const dbSlug = pathToSlugMap[location.pathname] || 'legal-notice';
      
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('slug', dbSlug)
        .single();

      if (error) {
        console.error('Error fetching legal page:', error);
        navigate('/');
        return;
      }

      setPage(data);
      setLoading(false);
    };

    fetchPage();
  }, [location.pathname, navigate]);

  const title = page ? (language === 'fr' ? page.title_fr : page.title_en) : '';
  const content = page ? (language === 'fr' ? page.content_fr : page.content_en) : '';
  const updatedAt = page?.updated_at ? new Date(page.updated_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US') : '';

  return (
    <div className="min-h-screen flex flex-col pt-16">
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
