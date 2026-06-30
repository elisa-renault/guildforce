import { BarChart3, ChevronRight, Clock, Users } from 'lucide-react';
import { forwardRef, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { GuildPoll } from '@/types/poll';

import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceFromNowLocalized } from '@/i18n/format';
import { getPollPrimaryAction } from '@/lib/pollAccess';

interface ActivePollWidgetSurfaceProps {
  activePoll?: GuildPoll | null;
  closedPoll?: GuildPoll | null;
  basePath: string;
  isGM?: boolean;
  hasRespondedToClosedPoll?: boolean;
  canViewClosedPollResults?: boolean;
  hasManagePollsPermission?: boolean;
}

export const ActivePollWidgetSurface = forwardRef<HTMLDivElement, ActivePollWidgetSurfaceProps>(
  ({
    activePoll,
    closedPoll,
    basePath,
    isGM = false,
    hasRespondedToClosedPoll = false,
    canViewClosedPollResults = false,
    hasManagePollsPermission = false,
  }, ref) => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const primaryAction = activePoll ? getPollPrimaryAction(activePoll, isGM) : 'none';

    if (!activePoll) {
      if (!closedPoll) {
        return null;
      }

      const handleReviewResponses = () => {
        navigate(`${basePath}/poll/${closedPoll.id}?view=responses`);
      };

      const handleReviewResults = () => {
        navigate(`${basePath}/poll/${closedPoll.id}/results`);
      };

      return (
        <div ref={ref} className="mb-6">
          <GlowCard surface="section" className="overflow-hidden">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t.polls.closed}
                </span>
              </div>

              <h3 className="line-clamp-2 font-medium text-foreground">{closedPoll.title}</h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {closedPoll.response_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 shrink-0" />
                    <span>
                      {closedPoll.response_count} {t.polls.responses}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {hasRespondedToClosedPoll && (
                  <Button variant="outline" size="sm" onClick={handleReviewResponses}>
                    {t.polls.reviewMyResponses}
                  </Button>
                )}
                {(isGM || hasManagePollsPermission || canViewClosedPollResults) && (
                  <Button variant="outline" size="sm" onClick={handleReviewResults}>
                    <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{t.common.results}</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReviewResponses}>
                  <span className="text-sm">{t.polls.view}</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </GlowCard>
        </div>
      );
    }

    if (primaryAction === 'none') {
      return null;
    }

    const handleClick = () => {
      if (primaryAction === 'results') {
        navigate(`${basePath}/poll/${activePoll.id}/results`);
        return;
      }

      navigate(`${basePath}/poll/${activePoll.id}`);
    };

    const handleResultsClick = (event: MouseEvent) => {
      event.stopPropagation();
      navigate(`${basePath}/poll/${activePoll.id}/results`);
    };

    return (
      <div ref={ref} className="mb-6">
        <GlowCard
          surface="section"
          className="cursor-pointer overflow-hidden p-4 transition-colors hover:border-primary/50"
          onClick={handleClick}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wide text-primary">{t.polls.activePoll}</span>
            </div>

            <h3 className="line-clamp-2 font-medium text-foreground">{activePoll.title}</h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {activePoll.response_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 shrink-0" />
                  <span>
                    {activePoll.response_count} {t.polls.responses}
                  </span>
                </div>
              )}
              {activePoll.ends_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>
                    {t.polls.ends}{' '}
                    {formatDistanceFromNowLocalized(activePoll.ends_at, language, true)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1" onClick={(event) => event.stopPropagation()}>
              {isGM && (
                <Button variant="outline" size="sm" onClick={handleResultsClick}>
                  <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t.common.results}</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={handleClick}>
                <span className="text-sm">
                  {primaryAction === 'results' ? t.polls.viewResults : t.polls.view}
                </span>
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </GlowCard>
      </div>
    );
  },
);

ActivePollWidgetSurface.displayName = 'ActivePollWidgetSurface';
