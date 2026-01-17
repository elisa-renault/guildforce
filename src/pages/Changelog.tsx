import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PatchNote {
  id: string;
  version: string;
  title_fr: string;
  title_en: string;
  content_fr: string;
  content_en: string;
  published_at: string | null;
}

export default function Changelog() {
  const { language, t } = useLanguage();
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotes() {
      const { data, error } = await supabase
        .from('patch_notes')
        .select('id, version, title_fr, title_en, content_fr, content_en, published_at')
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
            {notes.map((note) => (
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
                    {note.published_at && new Date(note.published_at).toLocaleDateString(language, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {language === 'fr' ? note.title_fr : note.title_en}
                </h2>

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>
                    {language === 'fr' ? note.content_fr : note.content_en}
                  </ReactMarkdown>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
