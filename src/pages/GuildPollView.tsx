import { Loader2, BarChart3, ArrowLeft, Lock, Edit } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ResponseValue } from '@/types/poll';

import { CosmicBackground } from '@/components/CosmicBackground';
import { PageContainer } from '@/components/layout/PageContainer';
import { PollResponse, PollResults } from '@/components/polls';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { usePoll, usePollResults, usePollMutations } from '@/hooks/useGuildPolls';
import { formatDateLocalized } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';

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
  const [canRespondToPoll, setCanRespondToPoll] = useState<boolean | null>(null);

  const { poll, loading: pollLoading, refetch } = usePoll(pollId);
  const { poll: pollResults, loading: resultsLoading, refetch: refetchResults } = usePollResults(pollId);
  const { submitAllResponses, checkCanViewResults, checkCanRespond, saving } = usePollMutations();
  const { hasPermission: hasManagePolls } = useHasGuildPermission(guildId, 'manage_polls');
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.polls.error;

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`${basePath}/polls`);
    }
  }, [navigate, basePath]);

  const isClosed =
    poll?.status === 'closed' || (poll?.ends_at && new Date(poll.ends_at) < new Date()) || false;

  const userCanViewResults = isGM || hasManagePolls || canViewResults === true;
  const userCanRespond = isGM || hasManagePolls || canRespondToPoll === true;
  const accessLoading = !isGM && !hasManagePolls && (canViewResults === null || canRespondToPoll === null);
  const showResultsPane =
    !isEditing &&
    (
      isClosed ||
      showResults ||
      (!userCanRespond && userCanViewResults) ||
      (!isGM && hasResponded && userCanViewResults)
    );
  const usesFullResultsLayout = showResultsPane && userCanViewResults;
  const showOuterHeader = !(showResultsPane && userCanViewResults);
  const canToggleResults = (isGM || hasManagePolls || (userCanViewResults && hasResponded)) && !isClosed;

  useEffect(() => {
    const checkAccess = async () => {
      if (pollId && !isGM && !hasManagePolls) {
        const [canView, canRespond] = await Promise.all([
          checkCanViewResults(pollId),
          checkCanRespond(pollId),
        ]);
        setCanViewResults(canView);
        setCanRespondToPoll(canRespond);
      } else if (isGM || hasManagePolls) {
        setCanViewResults(true);
        setCanRespondToPoll(true);
      }
    };

    checkAccess();
  }, [pollId, isGM, hasManagePolls, checkCanRespond, checkCanViewResults]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !regionSlug || !serverSlug || !guildSlug) return;

      const matchedGuild = await findGuildByRouteSlugs({
        supabase,
        regionSlug,
        serverSlug,
        guildSlug,
      });

      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      setGuildId(matchedGuild.id);

      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      });

      setIsGM(gmCheck || false);
      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  useEffect(() => {
    if (poll?.questions) {
      const responded = poll.questions.some((question) => question.my_response);
      setHasResponded(responded);
    }
  }, [poll]);

  const handleSubmit = async (responses: { questionId: string; value: ResponseValue }[]) => {
    try {
      await submitAllResponses(responses);
      toast({ title: sm('polls.mutations.submit_all_success') });
      setHasResponded(true);
      setShowResults(true);
      setIsEditing(false);
      refetch();
      refetchResults();
    } catch (error: unknown) {
      toast({ title: t.polls.error, description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  if (loading || accessLoading || pollLoading || (showResultsPane && resultsLoading)) {
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
        <p className="text-muted-foreground">{t.polls.notFound}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <PageContainer
        className={usesFullResultsLayout ? 'relative z-10 py-8' : 'relative z-10 py-8 max-w-3xl'}
        width={usesFullResultsLayout ? 'wide' : 'contained'}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-10 w-10 shrink-0 rounded-lg bg-muted/50 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>

          {canToggleResults && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResults(!showResults)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              {showResults ? t.polls.hideResults : t.polls.viewResults}
            </Button>
          )}
        </div>

        {showOuterHeader && (
          <>
            <div className="mb-4 min-w-0">
              <h1 className="text-2xl font-bold">{poll.title}</h1>
              {poll.description && (
                <p className="mt-1 text-muted-foreground">{poll.description}</p>
              )}
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {poll.roster?.name && (
                <span className="rounded bg-muted/50 px-2 py-1">
                  {poll.roster.name}
                </span>
              )}
              {poll.ends_at && (
                <span className={isClosed ? 'text-destructive' : ''}>
                  {isClosed
                    ? t.polls.closed
                    : `${t.polls.endsOn}: ${formatDateLocalized(poll.ends_at, language, { dateStyle: 'medium' })}`}
                </span>
              )}
            </div>
          </>
        )}

        {showResultsPane && userCanViewResults ? (
          <div className="space-y-6">
            {hasResponded && !isClosed && userCanRespond && (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center justify-between">
                <p className="text-primary">{t.polls.alreadyResponded}</p>
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
              poll={pollResults || poll}
              variant="full"
              canUseCohortFilters={isGM || hasManagePolls}
            />
          </div>
        ) : !userCanRespond && !isEditing ? (
          <div className="space-y-6">
            <div className="bg-muted/30 border border-muted rounded-lg p-8 text-center">
              <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {userCanViewResults ? t.polls.resultsRestricted : t.polls.notFound}
              </p>
            </div>
          </div>
        ) : hasResponded && !userCanViewResults && !isEditing ? (
          <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center justify-between">
              <p className="text-primary">{t.polls.alreadyResponded}</p>
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
              <p className="text-muted-foreground">{t.polls.resultsRestricted}</p>
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
      </PageContainer>
    </div>
  );
};

export default GuildPollView;
