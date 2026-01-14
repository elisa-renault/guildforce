import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { GuildPoll, GuildPollQuestion, GuildPollResponse, PollFormData, ResponseValue } from '@/types/poll';

export const useGuildPolls = (guildId: string | undefined) => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<GuildPoll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    if (!guildId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guild_polls')
        .select(`
          *,
          creator:profiles!guild_polls_created_by_fkey(id, username, avatar_url),
          roster:rosters(id, name)
        `)
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch response counts for each poll
      const pollsWithCounts = await Promise.all(
        (data || []).map(async (poll) => {
          const { count } = await supabase
            .from('guild_poll_responses')
            .select('user_id', { count: 'exact', head: true })
            .in('question_id', 
              (await supabase
                .from('guild_poll_questions')
                .select('id')
                .eq('poll_id', poll.id)
              ).data?.map(q => q.id) || []
            );

          return {
            ...poll,
            response_count: count || 0,
          } as GuildPoll;
        })
      );

      setPolls(pollsWithCounts);
    } catch (error) {
      console.error('Error fetching polls:', error);
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
        my_response: myResponses?.find(r => r.question_id === q.id) as GuildPollResponse | undefined,
      })) as GuildPollQuestion[];

      setPoll({
        ...pollData,
        questions: questionsWithResponses,
      } as GuildPoll);
    } catch (error) {
      console.error('Error fetching poll:', error);
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

      // Fetch all responses with user info (if not anonymous)
      const { data: allResponses, error: allResponsesError } = await supabase
        .from('guild_poll_responses')
        .select(`
          *,
          user:profiles(id, username, avatar_url)
        `)
        .in('question_id', questions?.map(q => q.id) || []);

      if (allResponsesError) throw allResponsesError;

      // Map responses to questions
      const questionsWithResponses = questions?.map(q => ({
        ...q,
        options: q.options as string[],
        responses: allResponses?.filter(r => r.question_id === q.id) as GuildPollResponse[],
      })) as GuildPollQuestion[];

      // Count unique respondents
      const uniqueRespondents = new Set(allResponses?.map(r => r.user_id) || []);

      setPoll({
        ...pollData,
        questions: questionsWithResponses,
        response_count: uniqueRespondents.size,
      } as GuildPoll);
    } catch (error) {
      console.error('Error fetching poll results:', error);
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

      // Create questions
      if (data.questions.length > 0) {
        const questionsToInsert = data.questions.map((q, index) => ({
          poll_id: poll.id,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          display_order: index,
          options: q.options,
        }));

        const { error: questionsError } = await supabase
          .from('guild_poll_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      return poll.id;
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Erreur lors de la création du sondage');
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
      console.error('Error updating poll:', error);
      toast.error('Erreur lors de la mise à jour du sondage');
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
      toast.success('Sondage publié !');
      return true;
    } catch (error) {
      console.error('Error publishing poll:', error);
      toast.error('Erreur lors de la publication du sondage');
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
      toast.success('Sondage clôturé');
      return true;
    } catch (error) {
      console.error('Error closing poll:', error);
      toast.error('Erreur lors de la clôture du sondage');
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
      toast.success('Sondage supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting poll:', error);
      toast.error('Erreur lors de la suppression du sondage');
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
      console.error('Error submitting response:', error);
      toast.error('Erreur lors de l\'envoi de la réponse');
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
      toast.success('Réponses enregistrées !');
      return true;
    } catch (error) {
      console.error('Error submitting responses:', error);
      toast.error('Erreur lors de l\'envoi des réponses');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    createPoll,
    updatePoll,
    publishPoll,
    closePoll,
    deletePoll,
    submitResponse,
    submitAllResponses,
  };
};
