import { useState, useEffect, useCallback } from 'react';
import log from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type {
  GuildPoll,
  GuildPollQuestion,
  GuildPollResponse,
  GuildPollSection,
  PollFormData,
  PollResultsAccessConfig,
  PollResultsAccessRule,
  PollResultsVisibilityLevel,
  ResponseValue,
} from '@/types/poll';
import { resolveSemanticMessage } from '@/i18n/semantic';

export const useGuildPolls = (guildId: string | undefined) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<GuildPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    if (!guildId || !user) return;
    
    setLoading(true);
    try {
      // Check if user is GM (they see all polls)
      const { data: isGM } = await supabase.rpc('is_guild_gm', {
        p_guild_id: guildId,
        p_user_id: user.id,
      });

      // Check if user has manage_polls permission
      const { data: hasManagePolls } = await supabase.rpc('has_guild_permission', {
        p_guild_id: guildId,
        p_user_id: user.id,
        p_permission: 'manage_polls',
      });

      const canManagePolls = isGM || hasManagePolls;

      // Fetch polls with questions count in a single query
      const { data, error } = await supabase
        .from('guild_polls')
        .select(`
          *,
          creator:profiles!guild_polls_created_by_fkey(id, username, avatar_url),
          roster:rosters(id, name),
          questions:guild_poll_questions(id)
        `)
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setPolls([]);
        return;
      }

      // Filter polls based on respondent targeting (only for non-managers viewing active polls)
      let filteredData = data;
      if (!canManagePolls) {
        // Check can_respond for each active poll
        const pollAccessChecks = await Promise.all(
          data.map(async (poll) => {
            // Draft polls are never shown to non-managers
            if (poll.status === 'draft') {
              return { pollId: poll.id, canAccess: false };
            }
            // Closed polls are visible only if the user can view results
            if (poll.status === 'closed') {
              const { data: canViewResults } = await supabase.rpc('can_view_poll_results', {
                p_poll_id: poll.id,
                p_user_id: user.id,
              });
              return { pollId: poll.id, canAccess: canViewResults ?? false };
            }
            // For active polls, check targeting rules
            const { data: canRespond } = await supabase.rpc('can_respond_to_poll', {
              p_poll_id: poll.id,
              p_user_id: user.id,
            });
            return { pollId: poll.id, canAccess: canRespond ?? true };
          })
        );

        const accessiblePollIds = new Set(
          pollAccessChecks.filter(c => c.canAccess).map(c => c.pollId)
        );
        filteredData = data.filter(poll => accessiblePollIds.has(poll.id));
      }

      // Fetch response counts in a single call (bypasses results access but still enforces poll visibility)
      const responseCounts: Record<string, number> = {};
      const pollIds = filteredData.map(poll => poll.id);
      if (pollIds.length > 0) {
        const { data: counts, error: countsError } = await supabase
          .rpc('get_poll_response_counts', { p_poll_ids: pollIds });

        if (countsError) {
          log.error('Error fetching poll response counts:', countsError);
        } else {
          for (const row of counts || []) {
            responseCounts[row.poll_id] = row.response_count ?? 0;
          }
        }
      }

      const pollsWithCounts = filteredData.map(poll => ({
        ...poll,
        questions: undefined, // Remove questions array from the list view
        response_count: responseCounts[poll.id] || 0,
      })) as GuildPoll[];

      setPolls(pollsWithCounts);
    } catch (error) {
      log.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  }, [guildId, user]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  return { polls, loading, refetch: fetchPolls };
};

export const usePoll = (pollId: string | undefined) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<GuildPoll | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPoll = useCallback(async () => {
    if (!pollId || !user) return;
    
    setLoading(true);
    try {
      // Fetch poll with questions
      const { data: pollData, error: pollError } = await supabase
        .from('guild_polls')
        .select(`
          *,
          creator:profiles!guild_polls_created_by_fkey(id, username, avatar_url),
          roster:rosters(id, name)
        `)
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('guild_poll_questions')
        .select('*')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;

      // Fetch user's responses
      const { data: myResponses, error: responsesError } = await supabase
        .from('guild_poll_responses')
        .select('*')
        .in('question_id', questions?.map(q => q.id) || [])
        .eq('user_id', user.id);

      if (responsesError) throw responsesError;

      // Map responses to questions
      const questionsWithResponses = questions?.map(q => ({
        ...q,
        options: q.options as string[],
        scale_config: q.scale_config as any,
        condition: q.condition as any,
        allow_other: q.allow_other ?? false,
        my_response: myResponses?.find(r => r.question_id === q.id) as GuildPollResponse | undefined,
      })) as GuildPollQuestion[];

      setPoll({
        ...pollData,
        questions: questionsWithResponses,
      } as GuildPoll);
    } catch (error) {
      log.error('Error fetching poll:', error);
    } finally {
      setLoading(false);
    }
  }, [pollId, user]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  return { poll, loading, refetch: fetchPoll };
};

export const usePollResults = (pollId: string | undefined) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<GuildPoll | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    if (!pollId || !user) return;
    
    setLoading(true);
    try {
      // Fetch poll with questions
      const { data: pollData, error: pollError } = await supabase
        .from('guild_polls')
        .select(`
          *,
          creator:profiles!guild_polls_created_by_fkey(id, username, avatar_url),
          roster:rosters(id, name)
        `)
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('guild_poll_questions')
        .select('*')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;

      const { data: sections, error: sectionsError } = await supabase
        .from('guild_poll_sections')
        .select('*')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      const { data: visibilityMap, error: visibilityError } = await supabase.rpc('get_poll_results_visibility_map', {
        p_poll_id: pollId,
        p_user_id: user.id,
      });

      if (visibilityError) throw visibilityError;

      const visibilityByQuestion = new Map<string, PollResultsVisibilityLevel>(
        (visibilityMap || []).map((entry) => [
          entry.question_id,
          (entry.visibility_level as PollResultsVisibilityLevel) || 'none',
        ]),
      );

      const visibleQuestions = (questions || []).filter((question) => {
        const visibility = visibilityByQuestion.get(question.id) || 'none';
        return visibility !== 'none';
      });

      let allResponses: GuildPollResponse[] = [];
      if (visibleQuestions.length > 0) {
        const responseQuery = pollData.is_anonymous
          ? supabase
              .from('guild_poll_responses')
              .select('*')
          : supabase
              .from('guild_poll_responses')
              .select(`
                *,
                user:profiles(id, username, avatar_url)
              `);

        const { data: fetchedResponses, error: allResponsesError } = await responseQuery
          .in('question_id', visibleQuestions.map((question) => question.id));

        if (allResponsesError) throw allResponsesError;
        allResponses = fetchedResponses || [];
      }

      // Map responses to questions
      const questionsWithResponses = visibleQuestions.map(q => ({
        ...q,
        options: q.options as string[],
        scale_config: q.scale_config as any,
        condition: q.condition as any,
        allow_other: q.allow_other ?? false,
        responses: allResponses.filter(r => r.question_id === q.id) as GuildPollResponse[],
        effective_visibility: visibilityByQuestion.get(q.id) || 'none',
      })) as GuildPollQuestion[];

      // Count unique respondents
      const uniqueRespondents = new Set(allResponses.map(r => r.user_id) || []);

      setPoll({
        ...pollData,
        sections: (sections || []) as GuildPollSection[],
        questions: questionsWithResponses,
        response_count: uniqueRespondents.size,
      } as GuildPoll);
    } catch (error) {
      log.error('Error fetching poll results:', error);
    } finally {
      setLoading(false);
    }
  }, [pollId, user]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return { poll, loading, refetch: fetchResults };
};

export const usePollMutations = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });
  const [saving, setSaving] = useState(false);

  const createPoll = async (guildId: string, data: PollFormData): Promise<string | null> => {
    if (!user) return null;
    
    setSaving(true);
    try {
      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from('guild_polls')
        .insert({
          guild_id: guildId,
          created_by: user.id,
          title: data.title,
          description: data.description || null,
          is_anonymous: data.is_anonymous,
          allow_multiple_responses: data.allow_multiple_responses,
          roster_id: data.roster_id || null,
          ends_at: data.ends_at || null,
          status: 'draft',
        })
        .select('id')
        .single();

      if (pollError) throw pollError;

      // Build a mapping from temp IDs (editor format) to display_order
      // This helps us remap conditions after questions are inserted
      const tempIdToDisplayOrder: Record<string, number> = {};
      let globalOrder = 0;

      // Map section questions
      // IMPORTANT: the condition editor often references questions using the editor IDs
      // (ex: "general-q-0") while existing questions have UUIDs.
      // We map BOTH so condition remapping works in all cases.
      for (let sIndex = 0; sIndex < data.sections.length; sIndex++) {
        const section = data.sections[sIndex];
        section.questions.forEach((q, qIndex) => {
          const editorId = `section-${sIndex}-q-${qIndex}`;
          const displayOrder = globalOrder + qIndex;
          tempIdToDisplayOrder[editorId] = displayOrder;
          if (q.id) tempIdToDisplayOrder[q.id] = displayOrder;
        });
        globalOrder += section.questions.length;
      }

      // Map general questions
      data.questions.forEach((q, qIndex) => {
        const editorId = `general-q-${qIndex}`;
        const displayOrder = globalOrder + qIndex;
        tempIdToDisplayOrder[editorId] = displayOrder;
        if (q.id) tempIdToDisplayOrder[q.id] = displayOrder;
      });

      // Reset globalOrder for actual insertion
      globalOrder = 0;
      const sectionIdMap: Record<number, string> = {};

      // Create sections and their questions (without conditions first)
      for (let sIndex = 0; sIndex < data.sections.length; sIndex++) {
        const section = data.sections[sIndex];
        
        const { data: sectionData, error: sectionError } = await supabase
          .from('guild_poll_sections')
          .insert({
            poll_id: poll.id,
            title: section.title,
            description: section.description || null,
            display_order: sIndex,
          })
          .select('id')
          .single();

        if (sectionError) throw sectionError;
        sectionIdMap[sIndex] = sectionData.id;

        // Create section questions without conditions
        if (section.questions.length > 0) {
          const sectionQuestions = section.questions.map((q, qIndex) => ({
            poll_id: poll.id,
            section_id: sectionData.id,
            question_text: q.question_text,
            question_type: q.question_type,
            analysis_intent: q.analysis_intent ?? 'decision',
            is_required: q.is_required,
            display_order: globalOrder + qIndex,
            options: q.options,
            scale_config: q.scale_config as any || null,
            allow_other: q.allow_other ?? false,
            condition: null, // Insert without condition first
          }));

          const { error: questionsError } = await supabase
            .from('guild_poll_questions')
            .insert(sectionQuestions);

          if (questionsError) throw questionsError;
          globalOrder += section.questions.length;
        }
      }

      // Create questions without section (without conditions first)
      if (data.questions.length > 0) {
        const questionsToInsert = data.questions.map((q, index) => ({
          poll_id: poll.id,
          section_id: null,
          question_text: q.question_text,
          question_type: q.question_type,
          analysis_intent: q.analysis_intent ?? 'decision',
          is_required: q.is_required,
          display_order: globalOrder + index,
          options: q.options,
          scale_config: q.scale_config as any || null,
          allow_other: q.allow_other ?? false,
          condition: null, // Insert without condition first
        }));

        const { error: questionsError } = await supabase
          .from('guild_poll_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      // Fetch all inserted questions to build display_order -> UUID map
      const { data: insertedQuestions, error: fetchError } = await supabase
        .from('guild_poll_questions')
        .select('id, display_order')
        .eq('poll_id', poll.id)
        .order('display_order');

      if (fetchError) throw fetchError;

      const displayOrderToUuid: Record<number, string> = {};
      insertedQuestions?.forEach(q => {
        displayOrderToUuid[q.display_order] = q.id;
      });

      // Now update questions that have conditions with real UUIDs
      const allQuestions = [
        ...data.sections.flatMap((s, sIndex) =>
          s.questions.map((q, qIndex) => {
            const editorId = `section-${sIndex}-q-${qIndex}`;
            return {
              ...q,
              editorId,
              tempId: q.id || editorId,
            };
          })
        ),
        ...data.questions.map((q, qIndex) => {
          const editorId = `general-q-${qIndex}`;
          return {
            ...q,
            editorId,
            tempId: q.id || editorId,
          };
        }),
      ];

      for (const q of allQuestions) {
        if (q.condition?.question_id) {
          // Find the display_order of the source question
          const sourceDisplayOrder = tempIdToDisplayOrder[q.condition.question_id];
          const sourceUuid = displayOrderToUuid[sourceDisplayOrder];

          if (sourceUuid) {
            // Find this question's UUID
            const thisDisplayOrder =
              tempIdToDisplayOrder[(q as any).tempId] ?? tempIdToDisplayOrder[(q as any).editorId];
            const thisUuid = displayOrderToUuid[thisDisplayOrder];

            if (thisUuid) {
              const updatedCondition = {
                ...q.condition,
                question_id: sourceUuid,
              };

              const { error: condError } = await supabase
                .from('guild_poll_questions')
                .update({ condition: updatedCondition })
                .eq('id', thisUuid);

              if (condError) throw condError;
            }
          }
        }
      }

      return poll.id;
    } catch (error) {
      log.error('Error creating poll:', error);
      toast.error(sm('polls.mutations.create_error'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updatePoll = async (pollId: string, data: Partial<PollFormData>): Promise<boolean> => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.is_anonymous !== undefined) updateData.is_anonymous = data.is_anonymous;
      if (data.allow_multiple_responses !== undefined) updateData.allow_multiple_responses = data.allow_multiple_responses;
      if (data.roster_id !== undefined) updateData.roster_id = data.roster_id || null;
      if (data.ends_at !== undefined) updateData.ends_at = data.ends_at || null;

      const { error } = await supabase
        .from('guild_polls')
        .update(updateData)
        .eq('id', pollId);

      if (error) throw error;
      return true;
    } catch (error) {
      log.error('Error updating poll:', error);
      toast.error(sm('polls.mutations.update_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publishPoll = async (pollId: string): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('guild_polls')
        .update({ status: 'active' })
        .eq('id', pollId);

      if (error) throw error;
      toast.success(sm('polls.mutations.publish_success'));
      return true;
    } catch (error) {
      log.error('Error publishing poll:', error);
      toast.error(sm('polls.mutations.publish_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closePoll = async (pollId: string): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('guild_polls')
        .update({ status: 'closed' })
        .eq('id', pollId);

      if (error) throw error;
      toast.success(sm('polls.mutations.close_success'));
      return true;
    } catch (error) {
      log.error('Error closing poll:', error);
      toast.error(sm('polls.mutations.close_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deletePoll = async (pollId: string): Promise<boolean> => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('guild_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;
      toast.success(sm('polls.mutations.delete_success'));
      return true;
    } catch (error) {
      log.error('Error deleting poll:', error);
      toast.error(sm('polls.mutations.delete_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetPollResponses = async (pollId: string): Promise<boolean> => {
    setSaving(true);
    try {
      // Get all question IDs for this poll
      const { data: questions, error: questionsError } = await supabase
        .from('guild_poll_questions')
        .select('id')
        .eq('poll_id', pollId);

      if (questionsError) throw questionsError;

      if (questions && questions.length > 0) {
        const questionIds = questions.map(q => q.id);
        
        const { error } = await supabase
          .from('guild_poll_responses')
          .delete()
          .in('question_id', questionIds);

        if (error) throw error;
      }

      toast.success(sm('polls.mutations.reset_success'));
      return true;
    } catch (error) {
      log.error('Error resetting poll responses:', error);
      toast.error(sm('polls.mutations.reset_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updatePollQuestions = async (pollId: string, data: PollFormData): Promise<boolean> => {
    setSaving(true);
    try {
      // Delete existing questions and sections
      const { error: deleteQuestionsError } = await supabase
        .from('guild_poll_questions')
        .delete()
        .eq('poll_id', pollId);

      if (deleteQuestionsError) throw deleteQuestionsError;

      const { error: deleteSectionsError } = await supabase
        .from('guild_poll_sections')
        .delete()
        .eq('poll_id', pollId);

      if (deleteSectionsError) throw deleteSectionsError;

      // Build a mapping from temp IDs (editor format) to display_order
      const tempIdToDisplayOrder: Record<string, number> = {};
      let globalOrder = 0;

      // Map section questions
      // IMPORTANT: map BOTH editor IDs and UUIDs so remapping works when editing existing polls.
      for (let sIndex = 0; sIndex < data.sections.length; sIndex++) {
        const section = data.sections[sIndex];
        section.questions.forEach((q, qIndex) => {
          const editorId = `section-${sIndex}-q-${qIndex}`;
          const displayOrder = globalOrder + qIndex;
          tempIdToDisplayOrder[editorId] = displayOrder;
          if (q.id) tempIdToDisplayOrder[q.id] = displayOrder;
        });
        globalOrder += section.questions.length;
      }

      // Map general questions
      data.questions.forEach((q, qIndex) => {
        const editorId = `general-q-${qIndex}`;
        const displayOrder = globalOrder + qIndex;
        tempIdToDisplayOrder[editorId] = displayOrder;
        if (q.id) tempIdToDisplayOrder[q.id] = displayOrder;
      });

      // Reset globalOrder for actual insertion
      globalOrder = 0;

      // Recreate sections and questions (without conditions first)
      for (let sIndex = 0; sIndex < data.sections.length; sIndex++) {
        const section = data.sections[sIndex];
        
        const { data: sectionData, error: sectionError } = await supabase
          .from('guild_poll_sections')
          .insert({
            poll_id: pollId,
            title: section.title,
            description: section.description || null,
            display_order: sIndex,
          })
          .select('id')
          .single();

        if (sectionError) throw sectionError;

        if (section.questions.length > 0) {
          const sectionQuestions = section.questions.map((q, qIndex) => ({
            poll_id: pollId,
            section_id: sectionData.id,
            question_text: q.question_text,
            question_type: q.question_type,
            analysis_intent: q.analysis_intent ?? 'decision',
            is_required: q.is_required,
            display_order: globalOrder + qIndex,
            options: q.options,
            scale_config: q.scale_config as any || null,
            allow_other: q.allow_other ?? false,
            condition: null, // Insert without condition first
          }));

          const { error: questionsError } = await supabase
            .from('guild_poll_questions')
            .insert(sectionQuestions);

          if (questionsError) throw questionsError;
          globalOrder += section.questions.length;
        }
      }

      if (data.questions.length > 0) {
        const questionsToInsert = data.questions.map((q, index) => ({
          poll_id: pollId,
          section_id: null,
          question_text: q.question_text,
          question_type: q.question_type,
          analysis_intent: q.analysis_intent ?? 'decision',
          is_required: q.is_required,
          display_order: globalOrder + index,
          options: q.options,
          scale_config: q.scale_config as any || null,
          allow_other: q.allow_other ?? false,
          condition: null, // Insert without condition first
        }));

        const { error: questionsError } = await supabase
          .from('guild_poll_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      // Fetch all inserted questions to build display_order -> UUID map
      const { data: insertedQuestions, error: fetchError } = await supabase
        .from('guild_poll_questions')
        .select('id, display_order')
        .eq('poll_id', pollId)
        .order('display_order');

      if (fetchError) throw fetchError;

      const displayOrderToUuid: Record<number, string> = {};
      insertedQuestions?.forEach(q => {
        displayOrderToUuid[q.display_order] = q.id;
      });

      // Now update questions that have conditions with real UUIDs
      const allQuestions = [
        ...data.sections.flatMap((s, sIndex) =>
          s.questions.map((q, qIndex) => {
            const editorId = `section-${sIndex}-q-${qIndex}`;
            return {
              ...q,
              editorId,
              tempId: q.id || editorId,
            };
          })
        ),
        ...data.questions.map((q, qIndex) => {
          const editorId = `general-q-${qIndex}`;
          return {
            ...q,
            editorId,
            tempId: q.id || editorId,
          };
        }),
      ];

      for (const q of allQuestions) {
        if (q.condition?.question_id) {
          // Find the display_order of the source question
          const sourceDisplayOrder = tempIdToDisplayOrder[q.condition.question_id];
          const sourceUuid = displayOrderToUuid[sourceDisplayOrder];

          if (sourceUuid) {
            // Find this question's UUID
            const thisDisplayOrder =
              tempIdToDisplayOrder[(q as any).tempId] ?? tempIdToDisplayOrder[(q as any).editorId];
            const thisUuid = displayOrderToUuid[thisDisplayOrder];

            if (thisUuid) {
              const updatedCondition = {
                ...q.condition,
                question_id: sourceUuid,
              };

              const { error: condError } = await supabase
                .from('guild_poll_questions')
                .update({ condition: updatedCondition })
                .eq('id', thisUuid);

              if (condError) throw condError;
            }
          }
        }
      }

      toast.success(sm('polls.mutations.questions_updated'));
      return true;
    } catch (error) {
      log.error('Error updating poll questions:', error);
      toast.error(sm('polls.mutations.questions_update_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitResponse = async (
    questionId: string, 
    responseValue: ResponseValue
  ): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('guild_poll_responses')
        .upsert({
          question_id: questionId,
          user_id: user.id,
          response_value: responseValue,
        }, {
          onConflict: 'question_id,user_id',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      log.error('Error submitting response:', error);
      toast.error(sm('polls.mutations.submit_response_error'));
      return false;
    }
  };

  const submitAllResponses = async (
    responses: { questionId: string; value: ResponseValue }[]
  ): Promise<boolean> => {
    if (!user) return false;
    
    setSaving(true);
    try {
      const responsesToUpsert = responses.map(r => ({
        question_id: r.questionId,
        user_id: user.id,
        response_value: r.value,
      }));

      const { error } = await supabase
        .from('guild_poll_responses')
        .upsert(responsesToUpsert, {
          onConflict: 'question_id,user_id',
        });

      if (error) throw error;
      toast.success(sm('polls.mutations.submit_all_success'));
      return true;
    } catch (error) {
      log.error('Error submitting responses:', error);
      toast.error(sm('polls.mutations.submit_all_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const buildResolvedResultsRules = async (
    pollId: string,
    rules: PollResultsAccessRule[],
  ): Promise<PollResultsAccessRule[]> => {
    if (rules.length === 0) return [];

    const [{ data: sections, error: sectionsError }, { data: questions, error: questionsError }] = await Promise.all([
      supabase
        .from('guild_poll_sections')
        .select('id, display_order')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true }),
      supabase
        .from('guild_poll_questions')
        .select('id, section_id, question_type, display_order')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true }),
    ]);

    if (sectionsError) throw sectionsError;
    if (questionsError) throw questionsError;

    const sectionMap = new Map<string, string>();
    (sections || []).forEach((section) => {
      sectionMap.set(section.id, section.id);
      sectionMap.set(`section-${section.display_order}`, section.id);
    });

    const questionMap = new Map<string, string>();
    const questionTypeById = new Map<string, GuildPollQuestion['question_type']>();
    const sectionIndexById = new Map<string, number>();
    (sections || []).forEach((section, sectionIndex) => {
      sectionIndexById.set(section.id, sectionIndex);
    });

    const localQuestionIndexBySection = new Map<string, number>();
    let generalQuestionIndex = 0;

    (questions || []).forEach((question) => {
      questionMap.set(question.id, question.id);
      questionTypeById.set(question.id, question.question_type as GuildPollQuestion['question_type']);
      if (question.section_id) {
        const sectionIndex = sectionIndexById.get(question.section_id);
        const localIndex = localQuestionIndexBySection.get(question.section_id) || 0;
        if (sectionIndex !== undefined) {
          questionMap.set(`section-${sectionIndex}-q-${localIndex}`, question.id);
        }
        localQuestionIndexBySection.set(question.section_id, localIndex + 1);
      } else {
        questionMap.set(`general-q-${generalQuestionIndex}`, question.id);
        generalQuestionIndex += 1;
      }
    });

    return rules
      .map((rule) => {
        const nextRule: PollResultsAccessRule = { ...rule };

        if (nextRule.target_type === 'section') {
          if (!nextRule.section_id) return null;
          nextRule.section_id = sectionMap.get(nextRule.section_id) || undefined;
          if (!nextRule.section_id) return null;
        }

        if (nextRule.target_type === 'question') {
          if (!nextRule.question_id) return null;
          nextRule.question_id = questionMap.get(nextRule.question_id) || undefined;
          if (!nextRule.question_id) return null;
          nextRule.question_type = questionTypeById.get(nextRule.question_id);
        }

        if (nextRule.target_type === 'question_type' && !nextRule.question_type) {
          return null;
        }

        if (nextRule.target_type === 'question' || nextRule.target_type === 'question_type') {
          if (nextRule.visibility_level === 'non_text') {
            nextRule.visibility_level = nextRule.question_type === 'text' ? 'none' : 'full';
          }
        }

        return nextRule;
      })
      .filter((rule): rule is PollResultsAccessRule => Boolean(rule));
  };

  // Fetch poll results access config (memoized to avoid infinite refetch loops in consumers)
  const fetchResultsAccessRules = useCallback(async (pollId: string): Promise<PollResultsAccessConfig> => {
    const fallbackConfig: PollResultsAccessConfig = {
      base_audience: 'guild_members',
      base_visibility: 'full',
      rules: [],
    };

    try {
      const [{ data: pollData, error: pollError }, { data: rulesData, error: rulesError }] = await Promise.all([
        supabase
          .from('guild_polls')
          .select('results_base_audience, results_base_visibility')
          .eq('id', pollId)
          .single(),
        supabase
          .from('poll_results_access_rules')
          .select('*')
          .eq('poll_id', pollId),
      ]);

      if (pollError) throw pollError;
      if (rulesError) throw rulesError;

      return {
        base_audience: (pollData.results_base_audience as PollResultsAccessConfig['base_audience']) || 'guild_members',
        base_visibility: (pollData.results_base_visibility as PollResultsAccessConfig['base_visibility']) || 'full',
        rules:
          rulesData?.map((rule) => ({
            audience_type: rule.audience_type as PollResultsAccessRule['audience_type'],
            visibility_level: rule.visibility_level as PollResultsAccessRule['visibility_level'],
            target_type: rule.target_type as PollResultsAccessRule['target_type'],
            user_id: rule.user_id || undefined,
            min_rank_index: rule.min_rank_index ?? undefined,
            max_rank_index: rule.max_rank_index ?? undefined,
            section_id: rule.section_id || undefined,
            question_id: rule.question_id || undefined,
            question_type: (rule.question_type as PollResultsAccessRule['question_type']) || undefined,
          })) || [],
      };
    } catch (error) {
      log.error('Error fetching results access rules:', error);
      return fallbackConfig;
    }
  }, []);

  // Save poll results access config + overrides
  const saveResultsAccessRules = async (pollId: string, config: PollResultsAccessConfig): Promise<boolean> => {
    setSaving(true);
    try {
      const { error: pollError } = await supabase
        .from('guild_polls')
        .update({
          results_base_audience: config.base_audience,
          results_base_visibility: config.base_visibility,
        })
        .eq('id', pollId);

      if (pollError) throw pollError;

      const { error: deleteError } = await supabase
        .from('poll_results_access_rules')
        .delete()
        .eq('poll_id', pollId);

      if (deleteError) throw deleteError;

      if (config.rules.length > 0) {
        const resolvedRules = await buildResolvedResultsRules(pollId, config.rules);

        if (resolvedRules.length > 0) {
          const rulesToInsert = resolvedRules.map((rule) => ({
            poll_id: pollId,
            audience_type: rule.audience_type,
            visibility_level: rule.visibility_level,
            target_type: rule.target_type,
            user_id: rule.audience_type === 'user' ? rule.user_id : null,
            min_rank_index: rule.audience_type === 'rank_range' ? rule.min_rank_index ?? 0 : null,
            max_rank_index: rule.audience_type === 'rank_range' ? rule.max_rank_index ?? 0 : null,
            section_id: rule.target_type === 'section' ? rule.section_id : null,
            question_id: rule.target_type === 'question' ? rule.question_id : null,
            question_type: rule.target_type === 'question_type' ? rule.question_type : null,
          }));

          const { error: insertError } = await supabase
            .from('poll_results_access_rules')
            .insert(rulesToInsert);

          if (insertError) throw insertError;
        }
      }

      return true;
    } catch (error) {
      log.error('Error saving results access rules:', error);
      toast.error(sm('polls.mutations.results_rules_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Fetch poll respondent access rules
  const fetchRespondentRules = useCallback(async (pollId: string) => {
    try {
      const { data, error } = await supabase
        .from('poll_respondent_rules')
        .select('*')
        .eq('poll_id', pollId);

      if (error) {
        log.error('Error fetching respondent rules:', error);
        return [];
      }

      return (
        data?.map((rule) => ({
          access_type: rule.access_type as 'rank_range' | 'user',
          user_id: rule.user_id || undefined,
          min_rank_index: rule.min_rank_index ?? undefined,
          max_rank_index: rule.max_rank_index ?? undefined,
        })) || []
      );
    } catch (error) {
      log.error('Error fetching respondent rules:', error);
      return [];
    }
  }, []);

  // Save poll respondent access rules
  const saveRespondentRules = async (
    pollId: string, 
    rules: { access_type: 'rank_range' | 'user'; user_id?: string; min_rank_index?: number; max_rank_index?: number }[]
  ): Promise<boolean> => {
    setSaving(true);
    try {
      // Delete existing rules
      await supabase
        .from('poll_respondent_rules')
        .delete()
        .eq('poll_id', pollId);

      // Insert new rules if any
      if (rules.length > 0) {
        const rulesToInsert = rules.map(rule => ({
          poll_id: pollId,
          access_type: rule.access_type,
          user_id: rule.access_type === 'user' ? rule.user_id : null,
          min_rank_index: rule.access_type === 'rank_range' ? rule.min_rank_index : null,
          max_rank_index: rule.access_type === 'rank_range' ? rule.max_rank_index : null,
        }));

        const { error } = await supabase
          .from('poll_respondent_rules')
          .insert(rulesToInsert);

        if (error) throw error;
      }

      return true;
    } catch (error) {
      log.error('Error saving respondent rules:', error);
      toast.error(sm('polls.mutations.respondent_rules_error'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Check if current user can view results
  const checkCanViewResults = useCallback(async (pollId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('can_view_poll_results', {
        p_poll_id: pollId,
        p_user_id: user.id,
      });

      if (error) {
        log.error('Error checking results access:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      log.error('Error checking results access:', error);
      return false;
    }
  }, [user]);

  // Check if current user can respond to poll
  const checkCanRespond = useCallback(async (pollId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('can_respond_to_poll', {
        p_poll_id: pollId,
        p_user_id: user.id,
      });

      if (error) {
        log.error('Error checking respond access:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      log.error('Error checking respond access:', error);
      return false;
    }
  }, [user]);

  const duplicatePoll = async (pollId: string): Promise<string | null> => {
    if (!user) return null;
    
    setSaving(true);
    try {
      // Fetch the original poll
      const { data: originalPoll, error: pollError } = await supabase
        .from('guild_polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      // Fetch sections
      const { data: sections } = await supabase
        .from('guild_poll_sections')
        .select('*')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true });

      // Fetch questions
      const { data: questions } = await supabase
        .from('guild_poll_questions')
        .select('*')
        .eq('poll_id', pollId)
        .order('display_order', { ascending: true });

      // Create new poll as draft
      const { data: newPoll, error: newPollError } = await supabase
        .from('guild_polls')
        .insert({
          guild_id: originalPoll.guild_id,
          created_by: user.id,
          title: `${originalPoll.title} ${sm('polls.mutations.duplicate_suffix')}`,
          description: originalPoll.description,
          is_anonymous: originalPoll.is_anonymous,
          allow_multiple_responses: originalPoll.allow_multiple_responses,
          roster_id: originalPoll.roster_id,
          results_base_audience: originalPoll.results_base_audience,
          results_base_visibility: originalPoll.results_base_visibility,
          ends_at: null, // Reset end date
          status: 'draft',
        })
        .select('id')
        .single();

      if (newPollError) throw newPollError;

      // Map old section IDs to new ones
      const sectionIdMap: Record<string, string> = {};

      // Duplicate sections
      if (sections && sections.length > 0) {
        for (const section of sections) {
          const { data: newSection, error: sectionError } = await supabase
            .from('guild_poll_sections')
            .insert({
              poll_id: newPoll.id,
              title: section.title,
              description: section.description,
              display_order: section.display_order,
            })
            .select('id')
            .single();

          if (sectionError) throw sectionError;
          sectionIdMap[section.id] = newSection.id;
        }
      }

      // Duplicate questions
      if (questions && questions.length > 0) {
        // First pass: create questions and map old IDs to new ones
        const questionIdMap: Record<string, string> = {};
        const questionsToInsert = [];

        for (const q of questions) {
          questionsToInsert.push({
            poll_id: newPoll.id,
            section_id: q.section_id ? sectionIdMap[q.section_id] : null,
            question_text: q.question_text,
            question_type: q.question_type,
            analysis_intent: q.analysis_intent,
            is_required: q.is_required,
            display_order: q.display_order,
            options: q.options,
            scale_config: q.scale_config,
            allow_other: q.allow_other,
            condition: null, // Will be updated in second pass
          });
        }

        const { data: newQuestions, error: questionsError } = await supabase
          .from('guild_poll_questions')
          .insert(questionsToInsert)
          .select('id, display_order');

        if (questionsError) throw questionsError;

        // Build mapping from old question to new question by display_order
        const orderedOldQuestions = [...questions].sort((a, b) => a.display_order - b.display_order);
        const orderedNewQuestions = [...(newQuestions || [])].sort((a, b) => a.display_order - b.display_order);

        orderedOldQuestions.forEach((oldQ, idx) => {
          if (orderedNewQuestions[idx]) {
            questionIdMap[oldQ.id] = orderedNewQuestions[idx].id;
          }
        });

        // Second pass: update conditions with new question IDs
        for (const q of questions) {
          if (q.condition && typeof q.condition === 'object') {
            const condition = q.condition as { question_id?: string };
            if (condition.question_id && questionIdMap[condition.question_id]) {
              const newCondition = {
                ...condition,
                question_id: questionIdMap[condition.question_id],
              };
              const newQuestionId = questionIdMap[q.id];
              if (newQuestionId) {
                await supabase
                  .from('guild_poll_questions')
                  .update({ condition: newCondition })
                  .eq('id', newQuestionId);
              }
            }
          }
        }
      }

      return newPoll.id;
    } catch (error) {
      log.error('Error duplicating poll:', error);
      toast.error(sm('polls.mutations.duplicate_error'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    createPoll,
    updatePoll,
    updatePollQuestions,
    publishPoll,
    closePoll,
    deletePoll,
    duplicatePoll,
    resetPollResponses,
    submitResponse,
    submitAllResponses,
    fetchResultsAccessRules,
    saveResultsAccessRules,
    fetchRespondentRules,
    saveRespondentRules,
    checkCanViewResults,
    checkCanRespond,
  };
};
