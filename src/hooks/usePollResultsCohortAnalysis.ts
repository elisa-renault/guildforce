import { useEffect, useMemo, useState } from 'react';

import type { GuildPoll, PollResultsCohortAnalysis, PollResultsCohortFilter } from '@/types/poll';

import { buildPollResultsCohortPoll } from '@/components/polls/pollResultsCohort';
import { supabase } from '@/integrations/supabase/client';

interface UsePollResultsCohortAnalysisOptions {
  poll: GuildPoll | null;
  enabled: boolean;
  filters: PollResultsCohortFilter[];
}

interface UsePollResultsCohortAnalysisResult {
  analysis: PollResultsCohortAnalysis | null;
  poll: GuildPoll | null;
  loading: boolean;
  error: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeCohortAnalysis = (
  payload: unknown,
  fallbackFilters: PollResultsCohortFilter[],
): PollResultsCohortAnalysis | null => {
  if (!isRecord(payload) || !Array.isArray(payload.questions)) {
    return null;
  }

  return {
    cohort_respondent_count:
      typeof payload.cohort_respondent_count === 'number' ? payload.cohort_respondent_count : 0,
    global_respondent_count:
      typeof payload.global_respondent_count === 'number' ? payload.global_respondent_count : 0,
    is_anonymous_guarded: Boolean(payload.is_anonymous_guarded),
    filters: Array.isArray(payload.filters)
      ? (payload.filters as PollResultsCohortFilter[])
      : fallbackFilters,
    questions: (payload.questions as PollResultsCohortAnalysis['questions']).map((question) => ({
      question_id: question.question_id,
      response_count: question.response_count,
      is_redacted: question.is_redacted,
      redaction_reason: question.redaction_reason ?? null,
      responses: question.responses || [],
    })),
  };
};

export const usePollResultsCohortAnalysis = ({
  poll,
  enabled,
  filters,
}: UsePollResultsCohortAnalysisOptions): UsePollResultsCohortAnalysisResult => {
  const [analysis, setAnalysis] = useState<PollResultsCohortAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!enabled || !poll?.id || filters.length === 0) {
        setAnalysis(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('User not authenticated.');
        }

        const { data, error: rpcError } = await supabase.rpc('get_poll_results_cohort_analysis', {
          p_poll_id: poll.id,
          p_user_id: user.id,
          p_filters: filters,
        });

        if (rpcError) throw rpcError;

        const normalized = normalizeCohortAnalysis(data, filters);
        if (!normalized) {
          throw new Error('Invalid cohort analysis payload.');
        }

        setAnalysis(normalized);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to load cohort analysis.';
        setAnalysis(null);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [enabled, filters, filters.length, filtersKey, poll?.id]);

  return {
    analysis,
    poll: poll && analysis ? buildPollResultsCohortPoll(poll, analysis) : null,
    loading,
    error,
  };
};
