import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGuildPolls } from '@/hooks/useGuildPolls';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { BarChart3, ChevronRight, Users, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface ActivePollWidgetProps {
  guildId: string;
  guildSlug: string;
  isGM?: boolean;
}

export const ActivePollWidget = forwardRef<HTMLDivElement, ActivePollWidgetProps>(
  ({ guildId, guildSlug, isGM = false }, ref) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const locale = language === 'fr' ? fr : enUS;
  
  const { polls, loading } = useGuildPolls(guildId);
  
  // Get the first active poll
  const activePoll = polls.find(p => p.status === 'active');
  
  if (loading) {
    return null; // Don't show loading state, just wait
  }
  
  if (!activePoll) {
    return null; // No active poll, don't show the widget
  }

  const handleClick = () => {
    navigate(`/guild/${guildSlug}/poll/${activePoll.id}`);
  };

  const handleResultsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {language === 'fr' ? 'Sondage en cours' : 'Active Poll'}
            </span>
          </div>
          
          <h3 className="font-semibold text-foreground line-clamp-2">
            {activePoll.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {activePoll.response_count !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                <span>{activePoll.response_count} {language === 'fr' ? 'réponses' : 'responses'}</span>
              </div>
            )}
            {activePoll.ends_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                <span>
                  {language === 'fr' ? 'Fin' : 'Ends'}{' '}
                  {formatDistanceToNow(new Date(activePoll.ends_at), { addSuffix: true, locale })}
                </span>
              </div>
            )}
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
            {isGM && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleResultsClick}
              >
                <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{language === 'fr' ? 'Résultats' : 'Results'}</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="ml-auto">
              <span className="text-sm">{language === 'fr' ? 'Voir' : 'View'}</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </GlowCard>
    </div>
  );
});

ActivePollWidget.displayName = 'ActivePollWidget';