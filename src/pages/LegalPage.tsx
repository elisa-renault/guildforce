import { ArrowLeft, Calendar, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateLocalized } from '@/i18n/format';
import { supabase } from '@/integrations/supabase/client';

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

const pageDescriptions: Record<string, string> = {
  'legal-notice': 'Company, hosting, and publication information for Guildforce.',
  'privacy-policy': 'How Guildforce collects, uses, and protects account and guild data.',
  'terms-of-service': 'Rules and responsibilities for using Guildforce.',
};

const getEnglishContent = (page: LegalPageData | null) => {
  const english = page?.legal_page_translations.find((translation) => translation.language === 'en');

  return {
    title: english?.title?.trim() || 'Legal information',
    content: english?.content?.trim() || '',
  };
};

const getHeadingId = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const getArticleHeadings = (content: string): Array<{ id: string; text: string }> =>
  [...content.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean)
    .map((text) => ({ id: getHeadingId(text), text }));

const LegalPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const dbSlug = pathToSlugMap[location.pathname] || 'legal-notice';

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    const fetchPage = async () => {
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
  }, [dbSlug, navigate]);

  const { title, content } = getEnglishContent(page);
  const updatedAt = page?.updated_at
    ? formatDateLocalized(page.updated_at, 'en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const headings = getArticleHeadings(content);

  return (
    <div className="flex-1 relative pt-20 md:pt-24 pb-12">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10" width="contained">
        <PageHeader
          title={loading ? 'Legal information' : title}
          description={pageDescriptions[dbSlug]}
          icon={FileText}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          }
          className="mb-8"
        />

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <GlowCard className="p-6">
              <Skeleton className="h-5 w-48 mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-8" />
              <Skeleton className="h-40 w-full" />
            </GlowCard>
            <Skeleton className="hidden h-40 w-full lg:block" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <article className="min-w-0">
            <GlowCard className="p-6 md:p-8">
              <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Last updated: {updatedAt}</span>
              </div>

              <div className="prose prose-invert max-w-none prose-headings:scroll-mt-28 prose-headings:font-sans prose-headings:text-foreground prose-h2:mt-9 prose-h2:text-xl prose-h2:font-semibold prose-h3:text-lg prose-li:my-1.5 prose-li:text-muted-foreground prose-p:text-muted-foreground prose-p:leading-7 prose-ul:my-4 prose-ul:list-none prose-ul:pl-0">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2
                        id={getHeadingId(String(children))}
                        className="mb-4 mt-8 text-xl font-semibold text-foreground first:mt-0"
                      >
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mb-3 mt-6 text-lg font-medium text-foreground">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-6 ml-0 space-y-2.5 text-muted-foreground">
                        {children}
                      </ul>
                    ),
                    hr: () => <hr className="my-8 border-border/40" />,
                    li: ({ children }) => (
                      <li className="flex gap-3 text-sm leading-7 text-muted-foreground md:text-base">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{children}</span>
                      </li>
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
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <GlowCard className="p-4">
                  <h2 className="mb-4 text-xs font-medium text-muted-foreground">
                    On this page
                  </h2>
                  {headings.length > 0 ? (
                    <nav className="space-y-2">
                      {headings.map((heading, index) => (
                        <a
                          key={heading.id}
                          href={`#${heading.id}`}
                          className={`block rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted/30 hover:text-primary ${
                            index === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {heading.text}
                        </a>
                      ))}
                    </nav>
                  ) : (
                    <p className="text-sm text-muted-foreground">No sections</p>
                  )}
                </GlowCard>
              </div>
            </aside>
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default LegalPage;
