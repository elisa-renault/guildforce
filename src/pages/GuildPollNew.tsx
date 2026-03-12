import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageContainer } from '@/components/layout/PageContainer';
import { PollEditor, type ResultsAccessConfig, type RespondentAccessRule } from '@/components/polls';
import { usePollMutations } from '@/hooks/useGuildPolls';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import { useGuildRankLabels } from '@/hooks/useGuildRankLabels';
import type { PollFormData, SectionFormData, QuestionFormData } from '@/types/poll';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatRankLabel } from '@/lib/rankLabel';
import { findGuildByRouteSlugs } from '@/lib/findGuildByRouteSlugs';
import {
  hasPollStructureChanges,
  shouldResetResponsesForFullPollEdit,
  shouldRewriteQuestionsForPollEdit,
} from '@/lib/pollStructureChanges';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

interface PollSectionRow {
  id: string;
  title: string | null;
  description: string | null;
  display_order: number | null;
}

interface PollQuestionRow {
  id: string;
  section_id: string | null;
  question_text: string | null;
  question_type: QuestionFormData['question_type'];
  analysis_intent: QuestionFormData['analysis_intent'];
  is_required: boolean | null;
  options: string[] | null;
  scale_config: QuestionFormData['scale_config'];
  allow_other: boolean | null;
  condition: QuestionFormData['condition'];
  display_order: number | null;
}

interface ExistingPollData {
  id: string;
  status: string | null;
  title: string | null;
  description: string | null;
  is_anonymous: boolean | null;
  allow_multiple_responses: boolean | null;
  roster_id: string | null;
  ends_at: string | null;
  sections?: PollSectionRow[];
  questions?: PollQuestionRow[];
}

const GuildPollNew = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('mode') as 'metadata' | 'full' | null;
  const { language, t } = useLanguage();
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language, translations: t });
  const { user } = useAuth();
  const { toast } = useToast();
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.polls.error;
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null; officer_rank_threshold: number } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [rosters, setRosters] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);
  const [existingPoll, setExistingPoll] = useState<ExistingPollData | null>(null);
  const [initialAccessConfig, setInitialAccessConfig] = useState<ResultsAccessConfig>({
    base_audience: 'guild_members',
    base_visibility: 'full',
    rules: [],
  });
  const [initialRespondentRules, setInitialRespondentRules] = useState<RespondentAccessRule[]>([]);
  const [confirmResetDialog, setConfirmResetDialog] = useState(false);
  const [pendingFullEditData, setPendingFullEditData] = useState<{ data: PollFormData; accessConfig: ResultsAccessConfig; respondentRules: RespondentAccessRule[] } | null>(null);
  const { rankLabels } = useGuildRankLabels({ guildId });

  const { createPoll, updatePoll, updatePollQuestions, publishPoll, resetPollResponses, saveResultsAccessRules, fetchResultsAccessRules, saveRespondentRules, fetchRespondentRules, saving } = usePollMutations();
  const { hasPermission: hasManagePolls, loading: permLoading } = useHasGuildPermission(guildId, 'manage_polls');

  // User can manage polls if they are GM OR have manage_polls permission
  const canManagePolls = isGM || hasManagePolls;

  const isActivePoll = existingPoll?.status === 'active';
  const isMetadataOnly = editMode === 'metadata';

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!user || !regionSlug || !serverSlug || !guildSlug) return;

      try {
        const matchedBase = await findGuildByRouteSlugs({
          supabase,
          regionSlug,
          serverSlug,
          guildSlug,
        });

        // Only redirect to /guilds when the guild truly doesn't exist.
        // (Network hiccups should not kick the user out of an editing screen.)
        if (!matchedBase) {
          navigate('/guilds', { replace: true });
          return;
        }

        if (cancelled) return;

        const { data: matchedGuild, error: guildError } = await supabase
          .from('guilds')
          .select('id, name, server, region, officer_rank_threshold')
          .eq('id', matchedBase.id)
          .maybeSingle();

        if (guildError || !matchedGuild) {
          navigate('/guilds', { replace: true });
          return;
        }

        setGuildId(matchedGuild.id);
        setGuild({
          name: matchedGuild.name,
          server: matchedGuild.server,
          region: matchedGuild.region || 'eu',
          avatar_url: null,
          officer_rank_threshold: matchedGuild.officer_rank_threshold ?? 2,
        });

        // Check GM status
        const { data: gmCheck, error: gmError } = await supabase.rpc('is_guild_gm', {
          p_guild_id: matchedGuild.id,
          p_user_id: user.id,
        });
        if (gmError) throw gmError;
        if (cancelled) return;
        setIsGM(!!gmCheck);

        // Fetch rosters
        const { data: rostersData, error: rostersError } = await supabase
          .from('rosters')
          .select('id, name')
          .eq('guild_id', matchedGuild.id)
          .order('name');
        if (rostersError) throw rostersError;
        if (cancelled) return;
        setRosters(rostersData || []);

        // Fetch members with profiles for access rules
        const { data: rosterCache, error: rosterCacheError } = await supabase
          .from('guild_roster_cache')
          .select('matched_user_id, rank_index, rank_name')
          .eq('guild_id', matchedGuild.id)
          .not('matched_user_id', 'is', null);
        if (rosterCacheError) throw rosterCacheError;

        // Get unique user IDs and fetch their profiles
        const userIds = [
          ...new Set(rosterCache?.map((r) => r.matched_user_id).filter(Boolean) || []),
        ];
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds);
          if (profilesError) throw profilesError;
          if (cancelled) return;
          setMembers(profiles?.map((p) => ({ user_id: p.id, username: p.username })) || []);
        } else if (!cancelled) {
          setMembers([]);
        }

        // Get unique ranks
        const uniqueRanks = new Map<number, string>();
        rosterCache?.forEach((r) => {
          if (r.rank_index !== null && !uniqueRanks.has(r.rank_index)) {
            const normalizedLabel = formatRankLabel({
              rankName: r.rank_name,
              rankIndex: r.rank_index,
              rankLabel,
              guildMasterLabel: t.guild.rank0,
              customLabel: rankLabels[r.rank_index],
            });
            uniqueRanks.set(r.rank_index, normalizedLabel);
          }
        });
        if (!cancelled) {
          setRanks(
            Array.from(uniqueRanks.entries()).map(([rank_index, rank_name]) => ({
              rank_index,
              rank_name,
            }))
          );
        }

        // If editing, fetch existing poll and access rules
        if (pollId) {
          const { data: pollData, error: pollError } = await supabase
            .from('guild_polls')
            .select(`
              *,
              sections:guild_poll_sections(*),
              questions:guild_poll_questions(*)
            `)
            .eq('id', pollId)
            .single();

          if (pollError) throw pollError;

          if (!cancelled && pollData) {
            setExistingPoll(pollData);
            const rules = await fetchResultsAccessRules(pollId);
            const respRules = await fetchRespondentRules(pollId);
            if (!cancelled) {
              setInitialAccessConfig(rules);
              setInitialRespondentRules(respRules);
            }
          }
        }
      } catch {
        toast({
          title: t.polls.unstableConnection,
          description: t.polls.unstableConnectionDesc,
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    regionSlug,
    serverSlug,
    guildSlug,
    pollId,
    navigate,
    fetchResultsAccessRules,
    fetchRespondentRules,
    toast,
    language,
    rankLabels,
    rankLabel,
    t.guild.rank0,
    t.polls.unstableConnection,
    t.polls.unstableConnectionDesc,
  ]);

  const handleSave = async (data: PollFormData, accessConfig: ResultsAccessConfig, respondentRules?: RespondentAccessRule[]) => {
    if (!guildId) return;

    try {
      if (existingPoll) {
        const existingStructure = toPollFormData(existingPoll);
        const structureChanged = hasPollStructureChanges(existingStructure, data);
        const shouldResetResponses = shouldResetResponsesForFullPollEdit({
          pollStatus: existingPoll.status as 'draft' | 'active' | 'closed' | null,
          editMode,
          previousData: existingStructure,
          nextData: data,
        });
        const shouldRewriteQuestions = shouldRewriteQuestionsForPollEdit({
          hasStructureChanges: structureChanged,
        });

        if (shouldResetResponses) {
          setPendingFullEditData({ data, accessConfig, respondentRules: respondentRules || [] });
          setConfirmResetDialog(true);
          return;
        }
        
        await updatePoll(existingPoll.id, data);

        if (shouldRewriteQuestions) {
          await updatePollQuestions(existingPoll.id, data);
        }

        const resultsSaved = await saveResultsAccessRules(existingPoll.id, accessConfig);
        if (!resultsSaved) throw new Error('Failed to save poll results visibility settings.');

        if (respondentRules) {
          const respondentsSaved = await saveRespondentRules(existingPoll.id, respondentRules);
          if (!respondentsSaved) throw new Error('Failed to save poll respondent rules.');
        }
        
        toast({ title: t.polls.saved });
      } else {
        const newPollId = await createPoll(guildId, data);
        if (newPollId) {
          const resultsSaved = await saveResultsAccessRules(newPollId, accessConfig);
          if (!resultsSaved) throw new Error('Failed to save poll results visibility settings.');

          if (respondentRules) {
            const respondentsSaved = await saveRespondentRules(newPollId, respondentRules);
            if (!respondentsSaved) throw new Error('Failed to save poll respondent rules.');
          }
        }
        toast({ title: t.polls.draftSaved });
      }
      navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
    } catch (error: unknown) {
      toast({ title: t.polls.error, description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleConfirmFullEdit = async () => {
    if (!pendingFullEditData || !existingPoll) return;

    try {
      await resetPollResponses(existingPoll.id);
      await updatePoll(existingPoll.id, pendingFullEditData.data);
      await updatePollQuestions(existingPoll.id, pendingFullEditData.data);
      const resultsSaved = await saveResultsAccessRules(existingPoll.id, pendingFullEditData.accessConfig);
      if (!resultsSaved) throw new Error('Failed to save poll results visibility settings.');

      if (pendingFullEditData.respondentRules) {
        const respondentsSaved = await saveRespondentRules(existingPoll.id, pendingFullEditData.respondentRules);
        if (!respondentsSaved) throw new Error('Failed to save poll respondent rules.');
      }
      
      toast({ title: t.polls.updated });
      navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
    } catch (error: unknown) {
      toast({ title: t.polls.error, description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setConfirmResetDialog(false);
      setPendingFullEditData(null);
    }
  };

  const handlePublish = async (data: PollFormData, accessConfig: ResultsAccessConfig, respondentRules?: RespondentAccessRule[]) => {
    if (!guildId) return;

    try {
      let pollIdToPublish = existingPoll?.id;
      
      if (!pollIdToPublish) {
        pollIdToPublish = await createPoll(guildId, data);
      } else {
        await updatePoll(existingPoll.id, data);
      }
      
      if (pollIdToPublish) {
        const resultsSaved = await saveResultsAccessRules(pollIdToPublish, accessConfig);
        if (!resultsSaved) throw new Error('Failed to save poll results visibility settings.');

        if (respondentRules) {
          const respondentsSaved = await saveRespondentRules(pollIdToPublish, respondentRules);
          if (!respondentsSaved) throw new Error('Failed to save poll respondent rules.');
        }
        await publishPoll(pollIdToPublish);
        toast({ title: t.polls.published });
        navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
      }
    } catch (error: unknown) {
      toast({ title: t.polls.error, description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  // If permissions are loaded and user can't manage polls, redirect away.
  // (Done in an effect to avoid navigation during render.)
  useEffect(() => {
    if (loading || permLoading) return;
    if (!regionSlug || !serverSlug || !guildSlug) return;

    if (!canManagePolls) {
      navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}`, { replace: true });
    }
  }, [loading, permLoading, canManagePolls, navigate, regionSlug, serverSlug, guildSlug]);

  if (loading || permLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManagePolls) {
    return null;
  }

  const toPollFormData = (poll: ExistingPollData): PollFormData => {
    const rawSections = Array.isArray(poll?.sections) ? poll.sections : [];
    const rawQuestions = Array.isArray(poll?.questions) ? poll.questions : [];

    const sectionsById = new Map<string, SectionFormData>();
    const sectionIndexById = new Map<string, number>();
    const sections: SectionFormData[] = rawSections
      .slice()
      .sort((a: PollSectionRow, b: PollSectionRow) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((s: PollSectionRow, index: number) => {
        const section: SectionFormData = {
          id: s.id,
          title: s.title || '',
          description: s.description || '',
          questions: [],
        };
        if (s.id) {
          sectionsById.set(s.id, section);
          sectionIndexById.set(s.id, index);
        }
        return section;
      });

    const sortedQuestions = rawQuestions
      .slice()
      .sort((a: PollQuestionRow, b: PollQuestionRow) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const generalQuestions: QuestionFormData[] = [];
    const questionIdToEditorId: Record<string, string> = {};
    const sectionQuestionCounts = new Map<number, number>();
    let generalIndex = 0;

    for (const q of sortedQuestions) {
      const sectionIndex = q.section_id ? sectionIndexById.get(q.section_id) : undefined;
      const editorId = sectionIndex !== undefined
        ? `section-${sectionIndex}-q-${sectionQuestionCounts.get(sectionIndex) ?? 0}`
        : `general-q-${generalIndex}`;

      if (sectionIndex !== undefined) {
        const currentCount = sectionQuestionCounts.get(sectionIndex) ?? 0;
        sectionQuestionCounts.set(sectionIndex, currentCount + 1);
      } else {
        generalIndex += 1;
      }

      if (q.id) {
        questionIdToEditorId[q.id] = editorId;
      }

      const qForm: QuestionFormData = {
        id: q.id,
        section_id: q.section_id ?? null,
        question_text: q.question_text || '',
        question_type: q.question_type,
        analysis_intent: q.analysis_intent ?? 'decision',
        is_required: !!q.is_required,
        options: Array.isArray(q.options) ? q.options : [],
        scale_config: q.scale_config ?? null,
        allow_other: q.allow_other ?? false,
        condition: q.condition ?? null,
      };

      if (qForm.section_id && sectionsById.has(qForm.section_id)) {
        sectionsById.get(qForm.section_id)!.questions.push(qForm);
      } else {
        generalQuestions.push({ ...qForm, section_id: null });
      }
    }

    const remapCondition = (question: QuestionFormData) => {
      if (question.condition?.question_id && questionIdToEditorId[question.condition.question_id]) {
        question.condition = {
          ...question.condition,
          question_id: questionIdToEditorId[question.condition.question_id],
        };
      }
    };

    sections.forEach((section) => {
      section.questions.forEach(remapCondition);
    });
    generalQuestions.forEach(remapCondition);

    return {
      title: poll.title || '',
      description: poll.description || '',
      is_anonymous: !!poll.is_anonymous,
      allow_multiple_responses: !!poll.allow_multiple_responses,
      roster_id: poll.roster_id ?? null,
      ends_at: poll.ends_at ?? null,
      sections,
      questions: generalQuestions,
    };
  };

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;
  const breadcrumbs = [
    { label: t.guildNav.polls, href: `${basePath}/polls` },
    { label: existingPoll ? t.common.edit : t.common.new },
  ];

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {guild && (
        <GuildSubNav
          guild={guild}
          guildId={guildId}
          basePath={basePath}
          isGM={isGM}
          activeTab="polls"
        />
      )}

      <PageContainer className="py-5 sm:py-8 max-w-4xl px-1 sm:px-4" width="contained">
        <Breadcrumbs items={breadcrumbs} className="mb-4 px-8" />
        <h1 className="text-2xl font-bold mb-6 px-8">
          {existingPoll ? t.polls.edit : t.polls.new}
        </h1>

        {isActivePoll && (
          <div className={`mb-6 p-4 rounded-lg border ${isMetadataOnly 
            ? 'bg-info/10 border-info/30' 
            : 'bg-warning/10 border-warning/30'}`}
          >
          <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${isMetadataOnly ? 'text-info' : 'text-warning'}`} />
              <span className={`font-medium ${isMetadataOnly ? 'text-info' : 'text-warning'}`}>
                {isMetadataOnly ? t.polls.settingsOnlyMode : t.polls.fullEditMode}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              {isMetadataOnly ? t.polls.settingsOnlyDesc : t.polls.fullEditDesc}
            </p>
          </div>
        )}

        <PollEditor
          rosters={rosters}
          members={members}
          ranks={ranks}
          initialData={existingPoll ? toPollFormData(existingPoll) : undefined}
          initialAccessConfig={initialAccessConfig}
          initialRespondentRules={initialRespondentRules}
          onSave={handleSave}
          onPublish={isActivePoll ? undefined : handlePublish}
          saving={saving}
          metadataOnly={isMetadataOnly}
        />
      </PageContainer>

      <AlertDialog open={confirmResetDialog} onOpenChange={setConfirmResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t.polls.confirmReset}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.polls.resetDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFullEdit}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t.polls.resetAndSave}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GuildPollNew;

