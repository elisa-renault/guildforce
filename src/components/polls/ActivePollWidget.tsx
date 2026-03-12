import { BarChart3, ChevronRight, Clock, Users } from 'lucide-react';
import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPolls } from '@/hooks/useGuildPolls';
import { formatDistanceFromNowLocalized } from '@/i18n/format';
import { supabase } from '@/integrations/supabase/client';
import { getPollPrimaryAction } from '@/lib/pollAccess';

interface ActivePollWidgetProps {
  guildId: string;
  guildSlug: string;
  isGM?: boolean;
}

export const ActivePollWidget = forwardRef<HTMLDivElement, ActivePollWidgetProps>(
  ({ guildId, guildSlug, isGM = false }, ref) => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { user } = useAuth();

    const { polls, loading } = useGuildPolls(guildId);
    const [hasRespondedToClosedPoll, setHasRespondedToClosedPoll] = React.useState(false);
    const [canViewClosedPollResults, setCanViewClosedPollResults] = React.useState(false);
    const [hasManagePollsPermission, setHasManagePollsPermission] = React.useState(false);

    const activePoll = polls.find((poll) => poll.status === 'active');
    const closedPoll = polls.find((poll) => poll.status === 'closed');
    const primaryAction = activePoll ? getPollPrimaryAction(activePoll, isGM) : 'none';

    React.useEffect(() => {
      const fetchClosedPollMeta = async () => {
        if (!closedPoll || activePoll || !user) {
          setHasRespondedToClosedPoll(false);
          setCanViewClosedPollResults(false);
          setHasManagePollsPermission(false);
          return;
        }

        const [{ data: canViewResults }, { data: hasManagePolls }, { data: questionRows, error: questionsError }] = await Promise.all([
          supabase.rpc('can_view_poll_results', {
            p_poll_id: closedPoll.id,
            p_user_id: user.id,
          }),
          supabase.rpc('has_guild_permission', {
            p_guild_id: guildId,
            p_user_id: user.id,
            p_permission: 'manage_polls',
          }),
          supabase.from('guild_poll_questions').select('id').eq('poll_id', closedPoll.id),
        ]);

        if (questionsError || !questionRows?.length) {
          setHasRespondedToClosedPoll(false);
          setCanViewClosedPollResults(Boolean(canViewResults));
          setHasManagePollsPermission(Boolean(hasManagePolls));
          return;
        }

        const { count, error: responsesError } = await supabase
          .from('guild_poll_responses')
          .select('id', { count: 'exact', head: true })
          .in('question_id', questionRows.map((question) => question.id))
          .eq('user_id', user.id);

        setHasRespondedToClosedPoll(!responsesError && (count ?? 0) > 0);
        setCanViewClosedPollResults(Boolean(canViewResults));
        setHasManagePollsPermission(Boolean(hasManagePolls));
      };

      fetchClosedPollMeta();
    }, [activePoll, closedPoll, guildId, user]);

    if (loading) {
      return null;
    }

    if (!activePoll) {
      if (!closedPoll) {
        return null;
      }

      const handleReviewResponses = () => {
        navigate(`/guild/${guildSlug}/poll/${closedPoll.id}`);
      };

      const handleReviewResults = () => {
        navigate(`/guild/${guildSlug}/poll/${closedPoll.id}/results`);
      };

      return (
        <div ref={ref} className="mb-6">
          <GlowCard className="p-4 overflow-hidden">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t.polls.closed}
                </span>
              </div>

              <h3 className="font-semibold text-foreground line-clamp-2">{closedPoll.title}</h3>

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

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
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
                  <ChevronRight className="h-4 w-4 ml-1" />
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
        navigate(`/guild/${guildSlug}/poll/${activePoll.id}/results`);
        return;
      }

      navigate(`/guild/${guildSlug}/poll/${activePoll.id}`);
    };

    const handleResultsClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      navigate(`/guild/${guildSlug}/poll/${activePoll.id}/results`);
    };

    return (
      <div ref={ref} className="mb-6">
        <GlowCard
          className="p-4 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
          onClick={handleClick}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">{t.polls.activePoll}</span>
            </div>

            <h3 className="font-semibold text-foreground line-clamp-2">{activePoll.title}</h3>

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

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30" onClick={(event) => event.stopPropagation()}>
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
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </GlowCard>
      </div>
    );
  },
);

ActivePollWidget.displayName = 'ActivePollWidget';
