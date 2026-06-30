import { Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildWorkspaceShell } from '@/components/guild';
import { PollResultsSurface } from '@/components/polls';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { usePollResults, usePollMutations } from '@/hooks/useGuildPolls';
import { usePollTextAiSummaries } from '@/hooks/usePollTextAiSummaries';
import { supabase } from '@/integrations/supabase/client';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';

const GuildPollResultsPage = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [canViewResults, setCanViewResults] = useState<boolean | null>(null);
  const [hasResponded, setHasResponded] = useState(false);

  const { poll, loading: resultsLoading } = usePollResults(pollId);
  const { checkCanViewResults } = usePollMutations();
  const { hasPermission: hasManagePolls } = useHasGuildPermission(guildId, 'manage_polls');

  const fullSlug = `${regionSlug}/${serverSlug}/${guildSlug}`;
  const basePath = `/guild/${fullSlug}`;
  const personalResponsesPath = `${basePath}/poll/${pollId}?view=responses`;

  // Handle back navigation - use history or fallback to polls list
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`${basePath}/polls`);
    }
  }, [navigate, basePath]);

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

      // Check GM status
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      });

      setIsGM(gmCheck || false);
      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, pollId, navigate]);

  useEffect(() => {
    const fetchHasResponded = async () => {
      if (!user || !pollId) {
        setHasResponded(false);
        return;
      }

      const { data: questionRows, error: questionsError } = await supabase
        .from('guild_poll_questions')
        .select('id')
        .eq('poll_id', pollId);

      if (questionsError || !questionRows?.length) {
        setHasResponded(false);
        return;
      }

      const { count, error: responsesError } = await supabase
        .from('guild_poll_responses')
        .select('id', { count: 'exact', head: true })
        .in('question_id', questionRows.map((question) => question.id))
        .eq('user_id', user.id);

      setHasResponded(!responsesError && (count ?? 0) > 0);
    };

    fetchHasResponded();
  }, [pollId, user]);

  // Check results access permission
  useEffect(() => {
    const checkAccess = async () => {
      if (pollId && !isGM && !hasManagePolls) {
        const canView = await checkCanViewResults(pollId);
        setCanViewResults(canView);
      } else if (isGM || hasManagePolls) {
        setCanViewResults(true);
      }
    };
    if (!loading) {
      checkAccess();
    }
  }, [pollId, isGM, hasManagePolls, checkCanViewResults, loading]);

  // User can view if GM, has manage_polls permission, or has specific results access
  const userCanViewResults = isGM || hasManagePolls || canViewResults === true;
  const accessLoading = !loading && !isGM && !hasManagePolls && canViewResults === null;
  const {
    summaries: aiSummaries,
    loading: aiSummariesLoading,
    generating: aiSummariesGenerating,
    error: aiSummariesError,
    generate: generateAiSummaries,
  } = usePollTextAiSummaries({
    poll,
    enabled: userCanViewResults,
  });
  const hasTextQuestions = useMemo(
    () => Boolean((poll?.questions || []).some((question) => question.question_type === 'text')),
    [poll?.questions],
  );
  const hasGeneratedAiSummaries = aiSummaries.some((summary) => summary.status !== 'not_generated');
  const canGenerateAiSummaries = isGM && hasTextQuestions;
  const aiSummaryActionLabel = hasGeneratedAiSummaries
    ? t.polls.resultsUi.aiSummary.regenerate
    : t.polls.resultsUi.aiSummary.generate;

  if (loading || accessLoading || resultsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  // If user doesn't have access to view results, show restricted message
  if (!userCanViewResults) {
    if (!guild) return null;

    return (
      <GuildWorkspaceShell
        guild={guild}
        guildId={guildId}
        basePath={basePath}
        isGM={isGM}
        activeTab="polls"
        context={{ status: t.common.results }}
      >
        <PollResultsSurface
          poll={poll}
          userCanViewResults={false}
          hasResponded={hasResponded}
          onBack={handleBack}
          onReviewMyResponses={() => navigate(personalResponsesPath)}
          canUseCohortFilters={false}
        />
      </GuildWorkspaceShell>
    );
  }


  if (!guild) return null;

  return (
    <GuildWorkspaceShell
      guild={guild}
      guildId={guildId}
      basePath={basePath}
      isGM={isGM}
      activeTab="polls"
      context={{ status: t.common.results }}
    >
      <PollResultsSurface
        poll={poll}
        userCanViewResults
        hasResponded={hasResponded}
        onBack={handleBack}
        onReviewMyResponses={() => navigate(personalResponsesPath)}
        canUseCohortFilters={isGM || hasManagePolls}
        aiSummaries={aiSummaries}
        aiSummariesLoading={aiSummariesLoading}
        aiSummariesError={aiSummariesError}
        canGenerateAiSummaries={canGenerateAiSummaries}
        aiSummariesGenerating={aiSummariesGenerating}
        aiSummaryActionLabel={aiSummaryActionLabel}
        onGenerateAiSummaries={() => {
          void generateAiSummaries();
        }}
      />
    </GuildWorkspaceShell>
  );
};

export default GuildPollResultsPage;
