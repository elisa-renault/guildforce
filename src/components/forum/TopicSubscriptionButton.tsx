import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    notificationsEnabled,
    loading,
    subscribe,
    unsubscribe,
    toggleNotifications,
  } = useTopicSubscription(topicId);

  if (!user) return null;

  const handleToggle = async () => {
    if (isSubscribed && notificationsEnabled) {
      // Currently subscribed with notifications - disable notifications
      await toggleNotifications();
    } else if (isSubscribed && !notificationsEnabled) {
      // Currently subscribed without notifications - unsubscribe completely
      await unsubscribe();
    } else {
      // Not subscribed - subscribe with notifications
      await subscribe(true);
    }
  };

  const getIcon = () => {
    if (isSubscribed && notificationsEnabled) {
      return <BellRing className="h-4 w-4" />;
    } else if (isSubscribed) {
      return <Bell className="h-4 w-4" />;
    }
    return <BellOff className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (isSubscribed && notificationsEnabled) {
      return t.notifications?.subscribed || 'Subscribed';
    } else if (isSubscribed) {
      return t.notifications?.subscribedNoNotif || 'Following (muted)';
    }
    return t.notifications?.subscribe || 'Subscribe';
  };

  const getTooltip = () => {
    if (isSubscribed && notificationsEnabled) {
      return t.notifications?.clickToMute || 'Click to mute notifications';
    } else if (isSubscribed) {
      return t.notifications?.clickToUnsubscribe || 'Click to unsubscribe';
    }
    return t.notifications?.clickToSubscribe || 'Click to subscribe';
  };

  if (variant === 'button') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            className={cn(
              'gap-2',
              isSubscribed && notificationsEnabled && 'text-primary border-primary/50'
            )}
          >
            {getIcon()}
            <span className="hidden sm:inline">{getLabel()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border">
          <DropdownMenuItem
            onClick={() => subscribe(true)}
            className={cn(
              'gap-2 cursor-pointer',
              isSubscribed && notificationsEnabled && 'bg-primary/10'
            )}
          >
            <BellRing className="h-4 w-4" />
            {t.notifications?.subscribeWithNotif || 'Subscribe with notifications'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => subscribe(false)}
            className={cn(
              'gap-2 cursor-pointer',
              isSubscribed && !notificationsEnabled && 'bg-primary/10'
            )}
          >
            <Bell className="h-4 w-4" />
            {t.notifications?.subscribeNoNotif || 'Follow without notifications'}
          </DropdownMenuItem>
          {isSubscribed && (
            <DropdownMenuItem
              onClick={unsubscribe}
              className="gap-2 cursor-pointer text-muted-foreground"
            >
              <BellOff className="h-4 w-4" />
              {t.notifications?.unsubscribe || 'Unsubscribe'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
              isSubscribed && notificationsEnabled && 'text-primary'
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
