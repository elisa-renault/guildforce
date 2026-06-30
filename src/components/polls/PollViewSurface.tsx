import { ArrowLeft, BarChart3, Edit, Lock } from 'lucide-react';

import type { GuildPoll, PollQuestionAiSummary, ResponseValue } from '@/types/poll';
import type { Dispatch, SetStateAction } from 'react';


import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PollResponse } from '@/components/polls/PollResponse';
import { PollResults } from '@/components/polls/PollResults';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDateLocalized } from '@/i18n/format';

interface PollViewSurfaceProps {
  poll: GuildPoll;
  pollResults?: GuildPoll | null;
  hasResponded: boolean;
  isClosed: boolean;
  userCanRespond: boolean;
  userCanViewResults: boolean;
  showResultsPane: boolean;
  showResults: boolean;
  setShowResults: Dispatch<SetStateAction<boolean>>;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  reviewingClosedResponses: boolean;
  canToggleResults: boolean;
  canOpenFullResults: boolean;
  onBack: () => void;
  onOpenFullResults: () => void;
  onSubmit: (responses: { questionId: string; value: ResponseValue }[]) => Promise<void>;
  saving?: boolean;
  canUseCohortFilters: boolean;
  aiSummaries?: PollQuestionAiSummary[];
  aiSummariesLoading?: boolean;
  aiSummariesError?: string | null;
}

export const PollViewSurface = ({
  poll,
  pollResults,
  hasResponded,
  isClosed,
  userCanRespond,
  userCanViewResults,
  showResultsPane,
  showResults,
  setShowResults,
  isEditing,
  setIsEditing,
  reviewingClosedResponses,
  canToggleResults,
  canOpenFullResults,
  onBack,
  onOpenFullResults,
  onSubmit,
  saving = false,
  canUseCohortFilters,
  aiSummaries,
  aiSummariesLoading,
  aiSummariesError,
}: PollViewSurfaceProps) => {
  const { language, t } = useLanguage();
  const showOuterHeader = !(showResultsPane && userCanViewResults);

  const actions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="h-10 w-10 shrink-0 rounded-lg bg-muted/50 hover:bg-muted"
        aria-label={t.common.back}
      >
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </Button>
      {canToggleResults && (
        <Button variant="outline" size="sm" onClick={() => setShowResults(!showResults)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          {showResults ? t.polls.hideResults : t.polls.viewResults}
        </Button>
      )}
      {!canToggleResults && canOpenFullResults && (
        <Button variant="outline" size="sm" onClick={onOpenFullResults}>
          <BarChart3 className="mr-2 h-4 w-4" />
          {t.common.results}
        </Button>
      )}
    </>
  );

  return (
    <PageContainer className="relative z-10 mx-auto max-w-5xl py-4 md:py-5" width="workspace">
      {showOuterHeader && (
        <PageHeader
          className="mb-4"
          title={poll.title}
          description={poll.description}
          bordered={false}
          actions={actions}
          meta={(
            <>
              {poll.roster?.name && (
                <span className="rounded bg-muted/45 px-2 py-1 text-xs font-medium text-foreground">
                  {poll.roster.name}
                </span>
              )}
              {poll.ends_at && (
                <span className={isClosed ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                  {isClosed
                    ? t.polls.closed
                    : `${t.polls.endsOn}: ${formatDateLocalized(poll.ends_at, language, { dateStyle: 'medium' })}`}
                </span>
              )}
            </>
          )}
        />
      )}

      {!showOuterHeader && (
        <div className="mb-6 flex items-center justify-between gap-3">
          {actions}
        </div>
      )}

      {showResultsPane && userCanViewResults ? (
        <div className="space-y-6">
          {hasResponded && !isClosed && userCanRespond && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-4">
              <p className="text-primary">{t.polls.alreadyResponded}</p>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {t.common.edit}
              </Button>
            </div>
          )}
          <PollResults
            poll={pollResults || poll}
            variant="full"
            canUseCohortFilters={canUseCohortFilters}
            aiSummaries={aiSummaries}
            aiSummariesLoading={aiSummariesLoading}
            aiSummariesError={aiSummariesError}
          />
        </div>
      ) : !userCanRespond && !isEditing ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-muted bg-muted/30 p-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {userCanViewResults ? t.polls.resultsRestricted : t.polls.notFound}
            </p>
          </div>
        </div>
      ) : hasResponded && !userCanViewResults && !isEditing ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-4">
            <p className="text-primary">{t.polls.alreadyResponded}</p>
            {!isClosed && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                {t.common.edit}
              </Button>
            )}
          </div>
          <div className="rounded-lg border border-muted bg-muted/30 p-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t.polls.resultsRestricted}</p>
          </div>
        </div>
      ) : (
        <PollResponse
          questions={poll.questions || []}
          isAnonymous={poll.is_anonymous}
          onSubmit={onSubmit}
          saving={saving}
          alreadyResponded={hasResponded}
          readOnly={reviewingClosedResponses}
        />
      )}
    </PageContainer>
  );
};
