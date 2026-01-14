import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronRight, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import type { GuildPoll } from '@/types/poll';

interface ActivePollWidgetProps {
  poll: GuildPoll;
  guildSlug: string;
  isGM: boolean;
}

export const ActivePollWidget = ({ poll, guildSlug, isGM }: ActivePollWidgetProps) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;

  const handleClick = () => {
    if (isGM) {
      navigate(`/guild/${guildSlug}/poll/${poll.id}/results`);
    } else {
      navigate(`/guild/${guildSlug}/poll/${poll.id}`);
    }
  };

  return (
    <GlowCard 
      className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {language === 'fr' ? 'Sondage en cours' : 'Active Poll'}
            </span>
          </div>
          
          <h3 className="font-semibold text-foreground truncate">
            {poll.title}
          </h3>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {poll.response_count !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{poll.response_count} {language === 'fr' ? 'réponses' : 'responses'}</span>
              </div>
            )}
            {poll.ends_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {language === 'fr' ? 'Fin' : 'Ends'}{' '}
                  {formatDistanceToNow(new Date(poll.ends_at), { addSuffix: true, locale })}
                </span>
              </div>
            )}
          </div>
        </div>

        <Button variant="ghost" size="icon" className="shrink-0">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </GlowCard>
  );
};
