import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toSlug } from '@/lib/guildSlug';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PollResponse, PollResults } from '@/components/polls';
import { usePoll, usePollResults, usePollMutations } from '@/hooks/useGuildPolls';
import { Loader2, BarChart3, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { ResponseValue } from '@/types/poll';

const GuildPollView = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const { poll, loading: pollLoading, refetch } = usePoll(pollId);
  const { poll: pollResults, loading: resultsLoading, refetch: refetchResults } = usePollResults(pollId);
  const { submitAllResponses, saving } = usePollMutations();

  const isClosed =
    poll?.status === 'closed' || (poll?.ends_at && new Date(poll.ends_at) < new Date()) || false;
  const showResultsPane = isClosed || showResults || (!isGM && hasResponded);
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !regionSlug || !serverSlug || !guildSlug) return;

      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region');

      const matchedGuild = allGuilds?.find(g =>
        toSlug(g.region || 'eu') === regionSlug &&
        toSlug(g.server) === serverSlug &&
        toSlug(g.name) === guildSlug
      );

      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      setGuildId(matchedGuild.id);

      // Check GM status
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      });

      setIsGM(gmCheck || false);
      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  // Check if user has already responded when poll loads
  useEffect(() => {
    if (poll?.questions) {
      const responded = poll.questions.some(q => q.my_response);
      setHasResponded(responded);
    }
  }, [poll]);

  const handleSubmit = async (responses: { questionId: string; value: ResponseValue }[]) => {
    try {
      await submitAllResponses(responses);
      toast({ title: language === 'fr' ? 'Réponses enregistrées !' : 'Responses submitted!' });
      setHasResponded(true);
      setShowResults(true);
      refetch();
      refetchResults();
    } catch (error: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading || pollLoading || (showResultsPane && resultsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <p className="text-muted-foreground">{language === 'fr' ? 'Sondage introuvable' : 'Poll not found'}</p>
      </div>
    );
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`${basePath}/polls`)}
            className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground mt-1">{poll.description}</p>
            )}
          </div>
          {isGM && !isClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResults(!showResults)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showResults 
                ? (language === 'fr' ? 'Masquer résultats' : 'Hide Results') 
                : (language === 'fr' ? 'Voir résultats' : 'View Results')
              }
            </Button>
          )}
        </div>

        {/* Poll metadata */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6">
          {poll.roster?.name && (
            <span className="bg-muted/50 px-2 py-1 rounded">
              {poll.roster.name}
            </span>
          )}
          {poll.ends_at && (
            <span className={isClosed ? 'text-destructive' : ''}>
              {isClosed 
                ? (language === 'fr' ? 'Clôturé' : 'Closed') 
                : `${language === 'fr' ? 'Termine le' : 'Ends'}: ${new Date(poll.ends_at).toLocaleDateString()}`
              }
            </span>
          )}
        </div>

        {/* Show results or response form */}
        {showResultsPane ? (
          <div className="space-y-6">
            {hasResponded && !isClosed && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                <p className="text-primary">
                  {language === 'fr' ? 'Vous avez déjà répondu à ce sondage' : 'You have already responded to this poll'}
                </p>
              </div>
            )}
            <PollResults
              questions={pollResults?.questions || poll.questions || []}
              isAnonymous={poll.is_anonymous}
              totalResponses={pollResults?.response_count || 0}
            />
          </div>
        ) : (
          <PollResponse
            questions={poll.questions || []}
            isAnonymous={poll.is_anonymous}
            onSubmit={handleSubmit}
            saving={saving}
            alreadyResponded={hasResponded}
          />
        )}
      </div>
    </div>
  );
};

export default GuildPollView;