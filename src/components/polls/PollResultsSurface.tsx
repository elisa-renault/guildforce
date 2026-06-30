import { ArrowLeft, Loader2, Lock, Sparkles } from 'lucide-react';

import type { GuildPoll, PollQuestionAiSummary } from '@/types/poll';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/layout/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PollResults } from '@/components/polls/PollResults';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface PollResultsSurfaceProps {
  poll: GuildPoll;
  userCanViewResults: boolean;
  hasResponded: boolean;
  onBack: () => void;
  onReviewMyResponses: () => void;
  canUseCohortFilters: boolean;
  aiSummaries?: PollQuestionAiSummary[];
  aiSummariesLoading?: boolean;
  aiSummariesError?: string | null;
  canGenerateAiSummaries?: boolean;
  aiSummariesGenerating?: boolean;
  aiSummaryActionLabel?: string;
  onGenerateAiSummaries?: () => void;
  restrictedAction?: ReactNode;
}

export const PollResultsSurface = ({
  poll,
  userCanViewResults,
  hasResponded,
  onBack,
  onReviewMyResponses,
  canUseCohortFilters,
  aiSummaries,
  aiSummariesLoading,
  aiSummariesError,
  canGenerateAiSummaries = false,
  aiSummariesGenerating = false,
  aiSummaryActionLabel,
  onGenerateAiSummaries,
  restrictedAction,
}: PollResultsSurfaceProps) => {
  const { t } = useLanguage();
  const backButton = (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-lg bg-card/60"
      onClick={onBack}
      aria-label={t.common.back}
    >
      <ArrowLeft className="h-5 w-5 text-muted-foreground" />
    </Button>
  );

  if (!userCanViewResults) {
    return (
      <PageContainer className="mx-auto max-w-5xl space-y-4 py-4 md:py-5" width="workspace">
        <PageHeader
          className="mb-0"
          title={poll.title}
          description={t.common.results}
          bordered={false}
          actions={backButton}
        />
        <EmptyState
          icon={Lock}
          title={t.polls.resultsRestricted}
          action={restrictedAction ?? (hasResponded ? (
            <Button variant="outline" onClick={onReviewMyResponses}>
              {t.polls.reviewMyResponses}
            </Button>
          ) : null)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="mx-auto max-w-5xl space-y-4 py-4 md:py-5" width="workspace">
      <PageHeader
        className="mb-0"
        title={poll.title}
        description={t.common.results}
        bordered={false}
        actions={(
          <>
            {backButton}
            {canGenerateAiSummaries && onGenerateAiSummaries && (
              <Button
                type="button"
                variant="outline"
                onClick={onGenerateAiSummaries}
                disabled={aiSummariesGenerating}
              >
                {aiSummariesGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiSummariesGenerating ? t.polls.resultsUi.aiSummary.generating : aiSummaryActionLabel}
              </Button>
            )}
            {hasResponded && (
              <Button variant="outline" onClick={onReviewMyResponses}>
                {t.polls.reviewMyResponses}
              </Button>
            )}
          </>
        )}
      />

      <PollResults
        poll={poll}
        variant="full"
        canUseCohortFilters={canUseCohortFilters}
        aiSummaries={aiSummaries}
        aiSummariesLoading={aiSummariesLoading}
        aiSummariesError={aiSummariesError}
        canGenerateAiSummaries={canGenerateAiSummaries}
      />
    </PageContainer>
  );
};
