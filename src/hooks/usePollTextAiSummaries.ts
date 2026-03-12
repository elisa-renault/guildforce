import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  GuildPoll,
  PollAiSummaryLocale,
  PollQuestionAiSummary,
} from '@/types/poll';

import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { normalizePollQuestionAiSummariesPayload } from '@/lib/pollAiSummary';

interface UsePollTextAiSummariesOptions {
  poll: GuildPoll | null;
  enabled?: boolean;
}

interface UsePollTextAiSummariesResult {
  summaries: PollQuestionAiSummary[];
  summariesByQuestion: Map<string, PollQuestionAiSummary>;
  loading: boolean;
  generating: boolean;
  error: string | null;
  locale: PollAiSummaryLocale;
  refetch: () => Promise<void>;
  generate: () => Promise<boolean>;
}

const FALLBACK_LOCALE: PollAiSummaryLocale = 'en';

const toSummaryLocale = (language: string): PollAiSummaryLocale => {
  switch (language) {
    case 'fr':
      return 'fr';
    case 'de':
      return 'de';
    case 'ru':
      return 'ru';
    default:
      return FALLBACK_LOCALE;
  }
};

export const usePollTextAiSummaries = ({
  poll,
  enabled = true,
}: UsePollTextAiSummariesOptions): UsePollTextAiSummariesResult => {
  const { language, t } = useLanguage();
  const { toast } = useToast();
  const [summaries, setSummaries] = useState<PollQuestionAiSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locale = useMemo(() => toSummaryLocale(language), [language]);
  const pollId = poll?.id;
  const hasTextQuestions = useMemo(
    () => Boolean(poll?.questions?.some((question) => question.question_type === 'text')),
    [poll?.questions],
  );
  const isClosedPoll = poll?.status === 'closed';

  const fetchSummaries = useCallback(async () => {
    if (!enabled || !pollId || !hasTextQuestions || !isClosedPoll) {
      setSummaries([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('poll-results-ai-summary', {
        body: {
          action: 'get',
          poll_id: pollId,
          locale,
        },
      });

      if (invokeError) throw invokeError;

      const normalized = normalizePollQuestionAiSummariesPayload(data);
      if (!normalized) {
        throw new Error('Invalid AI summary payload.');
      }

      setSummaries(normalized);
    } catch (caughtError) {
      setSummaries([]);
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load AI summaries.');
    } finally {
      setLoading(false);
    }
  }, [enabled, hasTextQuestions, isClosedPoll, locale, pollId]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const generate = useCallback(async () => {
    if (!pollId || !hasTextQuestions || !isClosedPoll) {
      return false;
    }

    setGenerating(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('poll-results-ai-summary', {
        body: {
          action: 'generate',
          poll_id: pollId,
          locale,
        },
      });

      if (invokeError) throw invokeError;

      const normalized = normalizePollQuestionAiSummariesPayload(data);
      if (!normalized) {
        throw new Error('Invalid AI summary payload.');
      }

      setSummaries(normalized);
      toast({ title: t.polls.resultsUi.aiSummary.generateSuccess });
      return true;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to generate AI summaries.';
      setError(message);
      toast({
        title: t.common.error,
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setGenerating(false);
    }
  }, [hasTextQuestions, isClosedPoll, locale, pollId, t.common.error, t.polls.resultsUi.aiSummary.generateSuccess, toast]);

  return {
    summaries,
    summariesByQuestion: new Map(summaries.map((summary) => [summary.question_id, summary])),
    loading,
    generating,
    error,
    locale,
    refetch: fetchSummaries,
    generate,
  };
};
