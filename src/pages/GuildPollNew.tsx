import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toSlug } from '@/lib/guildSlug';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GuildSubNav } from '@/components/guild';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PollEditor, type ResultsAccessRule } from '@/components/polls';
import { usePollMutations } from '@/hooks/useGuildPolls';
import { useHasGuildPermission } from '@/hooks/useGuildPermissions';
import type { PollFormData, SectionFormData, QuestionFormData } from '@/types/poll';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

const GuildPollNew = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug, pollId } = useParams();
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('mode') as 'metadata' | 'full' | null;
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guild, setGuild] = useState<{ name: string; server: string; region: string; avatar_url: string | null; officer_rank_threshold: number } | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [rosters, setRosters] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);
  const [existingPoll, setExistingPoll] = useState<any>(null);
  const [initialAccessRules, setInitialAccessRules] = useState<ResultsAccessRule[]>([]);
  const [confirmResetDialog, setConfirmResetDialog] = useState(false);
  const [pendingFullEditData, setPendingFullEditData] = useState<{ data: PollFormData; rules: ResultsAccessRule[] } | null>(null);

  const { createPoll, updatePoll, updatePollQuestions, publishPoll, resetPollResponses, saveResultsAccessRules, fetchResultsAccessRules, saving } = usePollMutations();
  const { hasPermission: hasManagePolls, loading: permLoading } = useHasGuildPermission(guildId, 'manage_polls');

  // User can manage polls if they are GM OR have manage_polls permission
  const canManagePolls = isGM || hasManagePolls;

  const isActivePoll = existingPoll?.status === 'active';
  const isMetadataOnly = editMode === 'metadata';

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !regionSlug || !serverSlug || !guildSlug) return;

      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, officer_rank_threshold');

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
      setGuild({
        name: matchedGuild.name,
        server: matchedGuild.server,
        region: matchedGuild.region || 'eu',
        avatar_url: null,
        officer_rank_threshold: matchedGuild.officer_rank_threshold ?? 2,
      });

      // Check GM status
      const { data: gmCheck } = await supabase.rpc('is_guild_gm', {
        p_guild_id: matchedGuild.id,
        p_user_id: user.id,
      });

      setIsGM(gmCheck || false);

      // Fetch rosters
      const { data: rostersData } = await supabase
        .from('rosters')
        .select('id, name')
        .eq('guild_id', matchedGuild.id)
        .order('name');

      setRosters(rostersData || []);

      // Fetch members with profiles for access rules
      const { data: rosterCache } = await supabase
        .from('guild_roster_cache')
        .select('matched_user_id, rank_index, rank_name')
        .eq('guild_id', matchedGuild.id)
        .not('matched_user_id', 'is', null);

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(rosterCache?.map(r => r.matched_user_id).filter(Boolean) || [])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        setMembers(profiles?.map(p => ({ user_id: p.id, username: p.username })) || []);
      }

      // Get unique ranks
      const uniqueRanks = new Map<number, string>();
      rosterCache?.forEach(r => {
        if (r.rank_index !== null && !uniqueRanks.has(r.rank_index)) {
          uniqueRanks.set(r.rank_index, r.rank_name || `Rank ${r.rank_index}`);
        }
      });
      setRanks(Array.from(uniqueRanks.entries()).map(([rank_index, rank_name]) => ({ rank_index, rank_name })));

      // If editing, fetch existing poll and access rules
      if (pollId) {
        const { data: pollData } = await supabase
          .from('guild_polls')
          .select(`
            *,
            sections:guild_poll_sections(*),
            questions:guild_poll_questions(*)
          `)
          .eq('id', pollId)
          .single();

        if (pollData) {
          setExistingPoll(pollData);
          const rules = await fetchResultsAccessRules(pollId);
          setInitialAccessRules(rules);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, regionSlug, serverSlug, guildSlug, pollId, navigate, fetchResultsAccessRules]);

  const handleSave = async (data: PollFormData, accessRules?: ResultsAccessRule[]) => {
    if (!guildId) return;

    try {
      if (existingPoll) {
        if (isActivePoll && editMode === 'full') {
          setPendingFullEditData({ data, rules: accessRules || [] });
          setConfirmResetDialog(true);
          return;
        }
        
        await updatePoll(existingPoll.id, data);
        if (accessRules) await saveResultsAccessRules(existingPoll.id, accessRules);
        
        if (!isActivePoll || editMode === 'full') {
          await updatePollQuestions(existingPoll.id, data);
        }
        
        toast({ title: language === 'fr' ? 'Sondage enregistré' : 'Poll saved' });
      } else {
        const newPollId = await createPoll(guildId, data);
        if (newPollId && accessRules) await saveResultsAccessRules(newPollId, accessRules);
        toast({ title: language === 'fr' ? 'Brouillon enregistré' : 'Draft saved' });
      }
      navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
    } catch (error: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleConfirmFullEdit = async () => {
    if (!pendingFullEditData || !existingPoll) return;

    try {
      await resetPollResponses(existingPoll.id);
      await updatePoll(existingPoll.id, pendingFullEditData.data);
      await updatePollQuestions(existingPoll.id, pendingFullEditData.data);
      if (pendingFullEditData.rules) await saveResultsAccessRules(existingPoll.id, pendingFullEditData.rules);
      
      toast({ title: language === 'fr' ? 'Sondage mis à jour' : 'Poll updated' });
      navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
    } catch (error: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setConfirmResetDialog(false);
      setPendingFullEditData(null);
    }
  };

  const handlePublish = async (data: PollFormData, accessRules?: ResultsAccessRule[]) => {
    if (!guildId) return;

    try {
      let pollIdToPublish = existingPoll?.id;
      
      if (!pollIdToPublish) {
        pollIdToPublish = await createPoll(guildId, data);
      } else {
        await updatePoll(existingPoll.id, data);
      }
      
      if (pollIdToPublish) {
        if (accessRules) await saveResultsAccessRules(pollIdToPublish, accessRules);
        await publishPoll(pollIdToPublish);
        toast({ title: language === 'fr' ? 'Sondage publié !' : 'Poll published!' });
        navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/polls`);
      }
    } catch (error: any) {
      toast({ title: language === 'fr' ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading || permLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if user doesn't have permission (check after loading is complete)
  if (!canManagePolls) {
    navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}`);
    return null;
  }

  const toPollFormData = (poll: any): PollFormData => {
    const rawSections = Array.isArray(poll?.sections) ? poll.sections : [];
    const rawQuestions = Array.isArray(poll?.questions) ? poll.questions : [];

    const sectionsById = new Map<string, SectionFormData>();
    const sections: SectionFormData[] = rawSections
      .slice()
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((s: any) => {
        const section: SectionFormData = {
          id: s.id,
          title: s.title || '',
          description: s.description || '',
          questions: [],
        };
        if (s.id) sectionsById.set(s.id, section);
        return section;
      });

    const sortedQuestions = rawQuestions
      .slice()
      .sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const generalQuestions: QuestionFormData[] = [];

    for (const q of sortedQuestions) {
      const qForm: QuestionFormData = {
        id: q.id,
        section_id: q.section_id ?? null,
        question_text: q.question_text || '',
        question_type: q.question_type,
        is_required: !!q.is_required,
        options: Array.isArray(q.options) ? q.options : [],
        scale_config: q.scale_config ?? null,
      };

      if (qForm.section_id && sectionsById.has(qForm.section_id)) {
        sectionsById.get(qForm.section_id)!.questions.push(qForm);
      } else {
        generalQuestions.push({ ...qForm, section_id: null });
      }
    }

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
    { label: t.guildNav?.polls || 'Polls', href: `${basePath}/polls` },
    { label: existingPoll ? (language === 'fr' ? 'Modifier' : 'Edit') : (language === 'fr' ? 'Nouveau' : 'New') },
  ];

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {guild && (
        <GuildSubNav
          guild={guild}
          basePath={basePath}
          isGM={canManagePolls}
          activeTab="polls"
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
        <h1 className="text-2xl font-bold mb-6">
          {existingPoll 
            ? (language === 'fr' ? 'Modifier le sondage' : 'Edit Poll') 
            : (language === 'fr' ? 'Nouveau sondage' : 'New Poll')
          }
        </h1>

        {isActivePoll && (
          <div className={`mb-6 p-4 rounded-lg border ${isMetadataOnly 
            ? 'bg-blue-500/10 border-blue-500/30' 
            : 'bg-yellow-500/10 border-yellow-500/30'}`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${isMetadataOnly ? 'text-blue-400' : 'text-yellow-400'}`} />
              <span className={`font-medium ${isMetadataOnly ? 'text-blue-400' : 'text-yellow-400'}`}>
                {isMetadataOnly 
                  ? (language === 'fr' ? 'Mode paramètres uniquement' : 'Settings only mode')
                  : (language === 'fr' ? 'Mode édition complète' : 'Full edit mode')
                }
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              {isMetadataOnly 
                ? (language === 'fr' 
                  ? 'Les questions ne peuvent pas être modifiées. Les réponses existantes seront conservées.'
                  : 'Questions cannot be modified. Existing responses will be preserved.')
                : (language === 'fr'
                  ? 'Attention : enregistrer réinitialisera toutes les réponses existantes.'
                  : 'Warning: saving will reset all existing responses.')
              }
            </p>
          </div>
        )}

        <PollEditor
          rosters={rosters}
          members={members}
          ranks={ranks}
          officerRankThreshold={guild?.officer_rank_threshold ?? 2}
          initialData={existingPoll ? toPollFormData(existingPoll) : undefined}
          initialAccessRules={initialAccessRules}
          onSave={handleSave}
          onPublish={isActivePoll ? undefined : handlePublish}
          saving={saving}
          metadataOnly={isMetadataOnly}
        />
      </div>

      <AlertDialog open={confirmResetDialog} onOpenChange={setConfirmResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {language === 'fr' ? 'Confirmer la réinitialisation' : 'Confirm Reset'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? 'Cette action supprimera définitivement toutes les réponses existantes. Cette action est irréversible.'
                : 'This action will permanently delete all existing responses. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFullEdit}
              className="bg-destructive hover:bg-destructive/90"
            >
              {language === 'fr' ? 'Réinitialiser et enregistrer' : 'Reset and Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GuildPollNew;