import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTopicSubscription } from '@/hooks/useTopicSubscription';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface TopicSubscriptionButtonProps {
  topicId: string;
  variant?: 'icon' | 'button';
}

export function TopicSubscriptionButton({ topicId, variant = 'icon' }: TopicSubscriptionButtonProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  } = useTopicSubscription(topicId);

  if (!user) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getIcon = () => {
    return isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />;
  };

  const getLabel = () => {
    return isSubscribed
      ? t.notifications.subscribed
      : t.notifications.subscribe;
  };

  const getTooltip = () => {
    return isSubscribed
      ? t.notifications.clickToUnsubscribe
      : t.notifications.clickToSubscribe;
  };

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'gap-2',
          isSubscribed && 'text-primary border-primary/50'
        )}
      >
        {getIcon()}
        <span className="hidden sm:inline">{getLabel()}</span>
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={loading}
            className={cn(
              'h-8 w-8',
              isSubscribed && 'text-primary'
            )}
          >
            {getIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltip()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
