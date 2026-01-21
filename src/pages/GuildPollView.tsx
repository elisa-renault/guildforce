import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, BarChart3, ArrowLeft, Lock, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type { ResponseValue } from '@/types/poll';

const GuildPollView = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [canViewResults, setCanViewResults] = useState<boolean | null>(null);

  const { poll, loading: pollLoading, refetch } = usePoll(pollId);
  const { poll: pollResults, loading: resultsLoading, refetch: refetchResults } = usePollResults(pollId);
  const { submitAllResponses, checkCanViewResults, saving } = usePollMutations();

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  // Handle back navigation - use history or fallback to polls list
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`${basePath}/polls`);
    }
  }, [navigate, basePath]);

  const isClosed =
    poll?.status === 'closed' || (poll?.ends_at && new Date(poll.ends_at) < new Date()) || false;
  
  // GM always can see results, otherwise check permission
  const userCanViewResults = isGM || canViewResults === true;
  // Show results pane unless user is editing their responses
  const showResultsPane = !isEditing && (isClosed || showResults || (!isGM && hasResponded && userCanViewResults));

  // Check results access permission when poll loads
  useEffect(() => {
    const checkAccess = async () => {
      if (pollId && !isGM) {
        const canView = await checkCanViewResults(pollId);
        setCanViewResults(canView);
      } else if (isGM) {
        setCanViewResults(true);
      }
    };
    checkAccess();
  }, [pollId, isGM, checkCanViewResults]);

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
      toast({ title: t.polls?.submitResponses ? t.polls.submitResponses.replace('Envoyer mes réponses', 'Réponses enregistrées !').replace('Submit my responses', 'Responses submitted!') : 'Responses submitted!' });
      setHasResponded(true);
      setShowResults(true);
      setIsEditing(false);
      refetch();
      refetchResults();
    } catch (error: any) {
      toast({ title: t.polls?.error || 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading || pollLoading || (showResultsPane && resultsLoading)) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <p className="text-muted-foreground">{t.polls?.notFound}</p>
      </div>
    );
  }


  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="w-10 h-10 shrink-0 rounded-lg bg-muted/50 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{poll.title}</h1>
              {poll.description && (
                <p className="text-muted-foreground mt-1">{poll.description}</p>
              )}
            </div>
          </div>
          {/* Show/Hide results button - for GM or users with permission who already responded */}
          {(isGM || (userCanViewResults && hasResponded)) && !isClosed && (
            <Button
              variant="outline"
              size="sm"
              className="self-start ml-14 md:ml-0 md:self-end"
              onClick={() => setShowResults(!showResults)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showResults ? t.polls?.hideResults : t.polls?.viewResults}
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
                ? t.polls?.closed 
                : `${t.polls?.endsOn}: ${new Date(poll.ends_at).toLocaleDateString()}`
              }
            </span>
          )}
        </div>

        {/* Show results or response form */}
        {showResultsPane && userCanViewResults ? (
          <div className="space-y-6">
            {hasResponded && !isClosed && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center justify-between">
              <p className="text-primary">
                  {t.polls?.alreadyResponded}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t.common.edit}
                </Button>
              </div>
            )}
            <PollResults
              questions={pollResults?.questions || poll.questions || []}
              isAnonymous={poll.is_anonymous}
              totalResponses={pollResults?.response_count || 0}
            />
          </div>
        ) : hasResponded && !userCanViewResults && !isEditing ? (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center justify-between">
              <p className="text-primary">
                  {t.polls?.alreadyResponded}
                </p>
              {!isClosed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t.common.edit}
                </Button>
              )}
            </div>
            <div className="bg-muted/30 border border-muted rounded-lg p-8 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t.polls?.resultsRestricted}
              </p>
            </div>
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