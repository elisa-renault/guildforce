import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ForumTopic, REACTION_TYPES } from '@/types/forum';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pin, Lock, MessageSquare, Eye, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';

interface ForumTopicListProps {
  topics: ForumTopic[];
  basePath?: string;
}

export const ForumTopicList = ({ topics, basePath = '/forum' }: ForumTopicListProps) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const locale = DATE_LOCALE_BY_LANGUAGE[language];

  if (topics.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t.forum.noTopics}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topics.map((topic) => {
        // Get top 3 reactions to display
        const topReactions = topic.reactions 
          ? Object.entries(topic.reactions.counts)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
          : [];

        return (
          <div
            key={topic.id}
            onClick={() => navigate(`${basePath}/topic/${topic.id}`)}
            className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all group ${
              topic.is_pinned
                ? 'bg-primary/5 border-primary/30 hover:border-primary/50'
                : 'bg-card/50 border-border/50 hover:border-border hover:bg-card/80'
            }`}
          >
            {/* Author avatar */}
            <Avatar className="h-10 w-10 flex-shrink-0">
              {topic.author?.avatar_url ? (
                <AvatarImage src={topic.author.avatar_url} alt={topic.author.username} />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              )}
            </Avatar>

            {/* Topic info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {topic.is_pinned && (
                  <Pin className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                {topic.is_locked && (
                  <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                )}
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {topic.title}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{topic.author?.username || 'Inconnu'}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale })}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1" title={t.forum.replies}>
                <MessageSquare className="h-4 w-4" />
                <span>{topic.reply_count}</span>
              </div>
              <div className="flex items-center gap-1" title={t.forum.views}>
                <Eye className="h-4 w-4" />
                <span>{topic.view_count}</span>
              </div>
              {/* Reactions preview */}
              {topReactions.length > 0 && (
                <div className="flex items-center gap-0.5" title={t.auto.components_forum_ForumTopicList_reactions_title}>
                  {topReactions.map(([type, count]) => (
                    <span key={type} className="text-xs">
                      {REACTION_TYPES[type as keyof typeof REACTION_TYPES]}
                    </span>
                  ))}
                  <span className="ml-1 text-xs">{topic.reactions?.total || 0}</span>
                </div>
              )}
            </div>

            {/* Last reply */}
            <div className="hidden lg:block min-w-[150px] text-right">
              {topic.last_reply_at ? (
                <div className="text-xs text-muted-foreground">
                  <p>
                    {formatDistanceToNow(new Date(topic.last_reply_at), { addSuffix: true, locale })}
                  </p>
                  {topic.last_reply_author && (
                    <p>{t.forum.by} {topic.last_reply_author.username}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t.forum.noPosts}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
