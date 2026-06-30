import React, { forwardRef } from 'react';

import { ActivePollWidgetSurface } from '@/components/polls/ActivePollWidgetSurface';
import { useAuth } from '@/contexts/AuthContext';
import { useGuildPolls } from '@/hooks/useGuildPolls';
import { supabase } from '@/integrations/supabase/client';

interface ActivePollWidgetProps {
  guildId: string;
  guildSlug: string;
  isGM?: boolean;
}

export const ActivePollWidget = forwardRef<HTMLDivElement, ActivePollWidgetProps>(
  ({ guildId, guildSlug, isGM = false }, ref) => {
    const { user } = useAuth();

    const { polls, loading } = useGuildPolls(guildId);
    const [hasRespondedToClosedPoll, setHasRespondedToClosedPoll] = React.useState(false);
    const [canViewClosedPollResults, setCanViewClosedPollResults] = React.useState(false);
    const [hasManagePollsPermission, setHasManagePollsPermission] = React.useState(false);

    const activePoll = polls.find((poll) => poll.status === 'active');
    const closedPoll = polls.find((poll) => poll.status === 'closed');

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

    return (
      <ActivePollWidgetSurface
        ref={ref}
        activePoll={activePoll}
        closedPoll={closedPoll}
        basePath={`/guild/${guildSlug}`}
        isGM={isGM}
        hasRespondedToClosedPoll={hasRespondedToClosedPoll}
        canViewClosedPollResults={canViewClosedPollResults}
        hasManagePollsPermission={hasManagePollsPermission}
      />
    );
  },
);

ActivePollWidget.displayName = 'ActivePollWidget';
