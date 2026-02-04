import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { selectContentTranslation } from '@/lib/contentTranslations';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDateLocalized } from '@/i18n/format';

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

export default function Changelog() {
  const { language, t } = useLanguage();
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotes() {
      const { data, error } = await supabase
        .from('patch_notes')
        .select('id, version, published_at, patch_note_translations(language, title, content)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!error && data) {
        setNotes(data);
      }
      setLoading(false);
    }

    fetchNotes();
  }, []);

  const isRecent = (date: string | null) => {
    if (!date) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(date) > sevenDaysAgo;
  };

  return (
    <div className="flex-1 relative pt-20 md:pt-24 pb-8">
      <CosmicBackground />

      <div className="container max-w-3xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20 ring-1 ring-primary/50">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display text-foreground">
              {t.patchnotes.changelog}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {t.patchnotes.changelogDesc}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <GlowCard key={i} className="p-6">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-5 w-48 mb-4" />
                <Skeleton className="h-20 w-full" />
              </GlowCard>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t.patchnotes.noNotes}</p>
          </GlowCard>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => {
              const localized = selectContentTranslation(note.patch_note_translations ?? [], language);
              const title = localized.title;
              const content = localized.content;
              return (
              <GlowCard key={note.id} className="p-6">
                {/* Version header */}
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <span className="font-mono text-xl font-bold text-foreground">
                    v{note.version}
                  </span>
                  {isRecent(note.published_at) && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {t.common.new}
                    </Badge>
                  )}
                    <span className="text-sm text-muted-foreground flex items-center gap-1 ml-auto">
                    <Calendar className="h-3.5 w-3.5" />
                    {note.published_at && formatDateLocalized(note.published_at, language, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {title}
                </h2>

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2 text-foreground">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 text-foreground/90">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-foreground/90">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/50 pl-4 my-2 italic text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      code: ({ className, children }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                            {children}
                          </code>
                        ) : (
                          <code className={`${className} block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto`}>
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children }) => (
                        <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
                          {children}
                        </pre>
                      ),
                      a: ({ href, children }) => (
                        <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      hr: () => <hr className="border-border my-4" />,
                      strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              </GlowCard>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
