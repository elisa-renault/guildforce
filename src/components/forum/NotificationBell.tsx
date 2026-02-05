import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, X, AtSign, MessageSquare, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, ForumNotification } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { formatDistanceFromNowLocalized, interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

export function NotificationBell() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const getNotificationIcon = (type: ForumNotification['type']) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-violet-400" />;
      case 'topic_reply':
        return <MessageSquare className="h-4 w-4 text-blue-400" />;
      case 'post_reply':
        return <Reply className="h-4 w-4 text-green-400" />;
    }
  };

  const getNotificationText = (notif: ForumNotification) => {
    const username = notif.triggered_by_username || t.forum.unknownUser;
    const topicTitle = notif.topic_title
      ? notif.topic_title.length > 30
        ? notif.topic_title.substring(0, 30) + '...'
        : notif.topic_title
      : '';

    switch (notif.type) {
      case 'mention':
        return interpolateMessage(s('forum.notifications.mention'), { username, topicTitle });
      case 'topic_reply':
        return interpolateMessage(s('forum.notifications.topic_reply'), { username, topicTitle });
      case 'post_reply':
        return interpolateMessage(s('forum.notifications.post_reply'), { username, topicTitle });
    }
  };

  const handleNotificationClick = async (notif: ForumNotification) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    if (notif.topic_id) {
      navigate(`/forum/topic/${notif.topic_id}`);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-white/5"
          aria-label={t.notifications.title}
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-card border-border"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-medium text-foreground">
            {t.notifications.title}
          </h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                {t.notifications.markAllRead}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={clearAllNotifications}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t.common.loading}...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {t.notifications.empty}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'group flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-white/5',
                    !notif.is_read && 'bg-primary/5'
                  )}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm leading-snug',
                        notif.is_read ? 'text-muted-foreground' : 'text-foreground'
                      )}
                    >
                      {getNotificationText(notif)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceFromNowLocalized(notif.created_at, language, true)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
