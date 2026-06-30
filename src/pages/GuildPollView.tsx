import { Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { ResponseValue } from '@/types/poll';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildWorkspaceShell } from '@/components/guild';
import { PollViewSurface } from '@/components/polls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { usePoll, usePollResults, usePollMutations } from '@/hooks/useGuildPolls';
import { usePollTextAiSummaries } from '@/hooks/usePollTextAiSummaries';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { supabase } from '@/integrations/supabase/client';
import { KILL_SWITCH_FEATURE_FLAGS, useKillSwitchFeatureEnabled } from '@/lib/featureFlags';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import { isReadOnlyResponsesView, shouldShowPollResultsPane } from '@/lib/pollViewMode';
import { capturePostHogProductEvent, trackProductEvent } from '@/lib/productEvents';

const GuildPollView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null } | null>(null);
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
  const pollAiEnabled = useKillSwitchFeatureEnabled(KILL_SWITCH_FEATURE_FLAGS.pollAi);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.polls.error;

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const fullSlug = `${regionSlug}/${serverSlug}/${guildSlug}`;
  const resultsPath = `${basePath}/poll/${pollId}/results`;

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
  const requestedView = searchParams.get('view');
  const reviewingClosedResponses = isReadOnlyResponsesView({
    hasResponded,
    isClosed,
    requestedView,
  });
  const showResultsPane = shouldShowPollResultsPane({
    hasResponded,
    isClosed,
    isEditing,
    isGM,
    requestedView,
    showResults,
    userCanRespond,
    userCanViewResults,
  });
  const canToggleResults = (isGM || hasManagePolls || (userCanViewResults && hasResponded)) && !isClosed;
  const canOpenFullResults = reviewingClosedResponses && userCanViewResults;
  const {
    summaries: aiSummaries,
    loading: aiSummariesLoading,
    error: aiSummariesError,
  } = usePollTextAiSummaries({
    poll: pollResults || poll,
    enabled: pollAiEnabled && showResultsPane && userCanViewResults,
  });

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
      setGuild({
        name: matchedGuild.name,
        server: matchedGuild.server,
        region: matchedGuild.region || 'eu',
        avatar_url: matchedGuild.avatar_url,
      });

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
      const submitted = await submitAllResponses(responses);
      if (!submitted) return;

      capturePostHogProductEvent('poll_voted', {
        source: 'guild_poll_view',
        feature_area: 'polls',
        guild_id: guildId,
        poll_id: pollId,
      });
      void trackProductEvent(supabase, 'activated_first_action', {
        source: 'guild_poll_view',
        featureArea: 'polls',
        guildId,
        pollId,
      });

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

  if (!guild) return null;

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guildId}
      basePath={`/guild/${fullSlug}`}
      isGM={isGM}
      activeTab="polls"
      context={{
        status: isClosed ? t.polls.closed : undefined,
      }}
    >
      <PollViewSurface
        poll={poll}
        pollResults={pollResults}
        hasResponded={hasResponded}
        isClosed={isClosed}
        userCanRespond={userCanRespond}
        userCanViewResults={userCanViewResults}
        showResultsPane={showResultsPane}
        showResults={showResults}
        setShowResults={setShowResults}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        reviewingClosedResponses={reviewingClosedResponses}
        canToggleResults={canToggleResults}
        canOpenFullResults={canOpenFullResults}
        onBack={handleBack}
        onOpenFullResults={() => navigate(resultsPath)}
        onSubmit={handleSubmit}
        saving={saving}
        canUseCohortFilters={isGM || hasManagePolls}
        aiSummaries={aiSummaries}
        aiSummariesLoading={aiSummariesLoading}
        aiSummariesError={aiSummariesError}
      />
    </GuildWorkspaceShell>
  );
};

export default GuildPollView;
