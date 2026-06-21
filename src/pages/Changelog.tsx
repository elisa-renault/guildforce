import { Bug, Calendar, List, RefreshCw, ScrollText, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateLocalized } from '@/i18n/format';
import { supabase } from '@/integrations/supabase/client';
import { getChangelogCategory, type PatchCategory } from '@/lib/changelogCategory';

const stripChangelogAutomationMarkers = (content: string): string =>
  content.replace(/<!--\s*guildforce-changelog-runs:[\s\S]*?-->/g, '').trim();

interface PatchNote {
  id: string;
  version: string;
  published_at: string | null;
  patch_note_translations: Array<{
    language: string;
    title: string;
    content: string;
  }>;
}

interface DisplayNote {
  id: string;
  version: string;
  publishedAt: string | null;
  title: string;
  content: string;
  category: PatchCategory;
}

const getEnglishContent = (note: PatchNote) => {
  const english = note.patch_note_translations.find((translation) => translation.language === 'en');
  const fallback = note.patch_note_translations[0] || { title: '', content: '' };
  return {
    ...(english || fallback),
    title: (english?.title || fallback.title || 'Guildforce update').trim(),
    content: stripChangelogAutomationMarkers(english?.content || fallback.content || ''),
  };
};

const getExcerpt = (content: string): string => {
  const plain = content
    .replace(/^#+\s+/gm, '')
    .replace(/^- /gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  return plain.length > 150 ? `${plain.slice(0, 147).trim()}...` : plain;
};

const getLeadParagraph = (content: string): string => {
  const lead = stripChangelogAutomationMarkers(content).split(/\n\s*\n/)[0] || '';
  const plain = lead
    .replace(/^#+\s+/gm, '')
    .replace(/^- /gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  return plain;
};

const getBodyWithoutLead = (content: string): string => {
  const cleanContent = stripChangelogAutomationMarkers(content);
  const blocks = cleanContent.split(/\n\s*\n/);

  if (blocks.length <= 1 || blocks[0].trim().startsWith('##')) {
    return cleanContent;
  }

  return blocks.slice(1).join('\n\n').trim();
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

const categoryIcon = {
  Feature: Sparkles,
  Update: RefreshCw,
  Bugfix: Bug,
};

const categoryClassName = {
  Feature: 'border-cyan-300/60 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgba(103,232,249,0.12)]',
  Update: 'border-info/35 bg-info/10 text-info',
  Bugfix: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
};

export default function Changelog() {
  const { version } = useParams<{ version?: string }>();
  const [notes, setNotes] = useState<DisplayNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotes() {
      const { data, error } = await supabase
        .from('patch_notes')
        .select('id, version, published_at, patch_note_translations(language, title, content)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!error && data) {
        const displayNotes = (data as PatchNote[]).map((note) => {
          const translation = getEnglishContent(note);
          const content = translation.content;
          return {
            id: note.id,
            version: note.version,
            publishedAt: note.published_at,
            title: translation.title,
            content,
            category: getChangelogCategory(translation.title, content),
          };
        });

        setNotes(displayNotes);
      }

      setLoading(false);
    }

    void fetchNotes();
  }, []);

  const selectedNote = version ? notes.find((note) => note.version === version) : undefined;

  return (
    <div className="flex-1 relative pt-20 md:pt-24 pb-12">
      <CosmicBackground />

      <PageContainer className="relative z-10" width="contained">
        {version && selectedNote ? (
          <PageHeader
            title={`v${selectedNote.version}: ${selectedNote.title}`}
            description="Release notes"
            icon={ScrollText}
            actions={
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/changelog">
                  <List className="h-4 w-4" />
                  All changelog
                </Link>
              </Button>
            }
            className="mb-8"
          />
        ) : (
          <PageHeader
            title="Changelog"
            description="Product updates, feature packs, and release notes for Guildforce."
            icon={ScrollText}
            className="mb-8"
          />
        )}

        {loading ? (
          <div className="space-y-6">
            <GlowCard className="p-6">
              <Skeleton className="h-40 w-full mb-6" />
              <Skeleton className="h-8 w-2/3 mb-4" />
              <Skeleton className="h-20 w-full" />
            </GlowCard>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : notes.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <p className="text-muted-foreground">No changelog entries yet.</p>
          </GlowCard>
        ) : version ? (
          selectedNote ? (
            <ChangelogDetail note={selectedNote} />
          ) : (
            <GlowCard className="p-8 text-center">
              <p className="mb-5 text-muted-foreground">This changelog entry does not exist.</p>
              <Link className="text-sm font-medium text-primary hover:text-primary/80" to="/changelog">
                Back to changelog
              </Link>
            </GlowCard>
          )
        ) : (
          <ChangelogIndex notes={notes} />
        )}
      </PageContainer>
    </div>
  );
}

const ChangelogIndex = ({
  notes,
}: {
  notes: DisplayNote[];
}) => {
  const featuredNote = notes[0];
  const featuredLead = getLeadParagraph(featuredNote.content) || getExcerpt(featuredNote.content);

  return (
    <>
      <div className="w-full">
        <Link to={getChangelogPath(featuredNote.version)} className="group block">
          <GlowCard className="overflow-hidden border-primary/20 p-0 transition-colors group-hover:border-primary/40">
            <div className="p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
                <CategoryLabel category={featuredNote.category} />
                <DateLabel publishedAt={featuredNote.publishedAt} />
              </div>
              <h2 className="text-2xl font-semibold leading-tight tracking-normal text-foreground md:text-3xl">
                v{featuredNote.version}: {featuredNote.title}
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
                {featuredLead}
              </p>
            </div>
          </GlowCard>
        </Link>
      </div>

      <section className="mt-12">
        <div className="mb-5 flex items-center">
          <h2 className="text-xl font-semibold tracking-normal text-foreground">
            History
          </h2>
        </div>

        <GlowCard className="overflow-hidden p-0">
          <div className="hidden grid-cols-[140px_160px_minmax(0,1fr)] border-b border-border/40 bg-muted/20 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
            <span>Date</span>
            <span>Category</span>
            <span>Title</span>
          </div>
          <div className="divide-y divide-border/40">
            {notes.map((note) => (
              <Link
                key={note.id}
                to={getChangelogPath(note.version)}
                className="grid w-full gap-2 px-4 py-4 text-left transition-colors hover:bg-muted/20 sm:grid-cols-[140px_160px_minmax(0,1fr)] sm:gap-0"
              >
                <span className="text-sm text-muted-foreground">
                  <FormattedDate publishedAt={note.publishedAt} />
                </span>
                <CategoryLabel category={note.category} />
                <span className="font-medium text-foreground">
                  v{note.version}: {note.title}
                </span>
              </Link>
            ))}
          </div>
        </GlowCard>
      </section>
    </>
  );
};

const ChangelogDetail = ({ note }: { note: DisplayNote }) => {
  const bodyContent = getBodyWithoutLead(note.content);
  const headings = getArticleHeadings(bodyContent);
  const lead = getLeadParagraph(note.content);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <article className="min-w-0">
        <GlowCard className="p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <CategoryLabel category={note.category} />
            <DateLabel publishedAt={note.publishedAt} />
            <span>Written by Elsia</span>
          </div>

          {lead ? (
            <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              {lead}
            </p>
          ) : null}

          <div className="my-8 h-px bg-border/40" />

          <div className="prose prose-invert max-w-none prose-headings:scroll-mt-28 prose-headings:font-sans prose-headings:text-foreground prose-h2:mt-9 prose-h2:text-xl prose-h2:font-semibold prose-h3:text-lg prose-li:my-1.5 prose-li:text-muted-foreground prose-p:text-muted-foreground prose-p:leading-7 prose-ul:my-4 prose-ul:list-none prose-ul:pl-0">
            <ReactMarkdown
              components={{
                h2: ({ children }) => {
                  const text = String(children);
                  return (
                    <h2
                      id={getHeadingId(text)}
                      className="mb-4 mt-8 border-t border-border/30 pt-6 text-xl font-semibold text-foreground first:mt-0 first:border-t-0 first:pt-0"
                    >
                      {children}
                    </h2>
                  );
                },
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
                li: ({ children }) => (
                  <li className="flex gap-3 text-sm leading-7 text-muted-foreground md:text-base">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-medium text-foreground">{children}</strong>
                ),
              }}
            >
              {bodyContent}
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
  );
};

const CategoryLabel = ({ category }: { category: PatchCategory }) => {
  const Icon = categoryIcon[category];
  return (
    <Badge variant="outline" className={`w-fit justify-start gap-1.5 px-2.5 ${categoryClassName[category]}`}>
      <Icon className="h-3.5 w-3.5" />
      {category}
    </Badge>
  );
};

const DateLabel = ({ publishedAt }: { publishedAt: string | null }) => (
  <span className="flex items-center gap-1.5 text-muted-foreground">
    <Calendar className="h-3.5 w-3.5" />
    <FormattedDate publishedAt={publishedAt} />
  </span>
);

const FormattedDate = ({ publishedAt }: { publishedAt: string | null }) => (
  <>
    {publishedAt
      ? formatDateLocalized(publishedAt, 'en', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'Unpublished'}
  </>
);

const getChangelogPath = (version: string): string => `/changelog/${version}`;
