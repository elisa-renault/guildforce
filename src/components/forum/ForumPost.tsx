import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ForumPost as ForumPostType, ReactionType } from '@/types/forum';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MarkdownEditor } from './MarkdownEditor';
import { ReactionPicker } from './ReactionPicker';
import { UserRoleBadge } from './UserRoleBadge';
import { ReportDialog } from './ReportDialog';
import { UserContextMenu } from './UserContextMenu';
import { Quote, Edit3, Trash2, User, Clock, Check, X, Flag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceFromNowLocalized } from '@/i18n/format';

interface ForumPostProps {
  post: ForumPostType;
  onQuote?: (post: ForumPostType) => void;
  onEdit?: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
  onReaction?: (postId: string, reactionType: ReactionType) => void;
  isTopicLocked?: boolean;
  isModerator?: boolean;
}

export const ForumPost = ({
  post,
  onQuote,
  onEdit,
  onDelete,
  onReaction,
  isTopicLocked = false,
  isModerator = false,
}: ForumPostProps) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const authorIds = useMemo(() => post.author_id ? [post.author_id] : [], [post.author_id]);
  const { roles } = useUserRoles(authorIds);
  const authorRoles = roles.get(post.author_id) || [];

  const isAuthor = user?.id === post.author_id;
  const canDelete = isAuthor || isModerator;
  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(post.id, editContent);
      setIsEditing(false);
    }
  };

  const authorData = post.author ? {
    id: post.author_id,
    username: post.author.username,
    avatar_url: post.author.avatar_url,
  } : null;

  return (
    <div className="flex gap-4 p-4 rounded-lg bg-card/50 border border-border/50">
      {/* Author info */}
      <div className="flex flex-col items-center gap-2 min-w-[80px]">
        {authorData ? (
          <UserContextMenu user={authorData} isModerator={isModerator}>
            <Avatar className="h-12 w-12 hover:ring-2 hover:ring-primary/50 transition-all">
              {post.author?.avatar_url ? (
                <AvatarImage src={post.author.avatar_url} alt={post.author.username} />
              ) : (
                <AvatarFallback className="bg-primary/20 text-primary">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              )}
            </Avatar>
          </UserContextMenu>
        ) : (
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/20 text-primary">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex flex-col items-center gap-1">
          {authorData ? (
            <UserContextMenu user={authorData} isModerator={isModerator}>
              <span className="text-sm font-medium text-foreground text-center hover:text-primary transition-colors">
                {post.author?.username || 'Inconnu'}
              </span>
            </UserContextMenu>
          ) : (
            <span className="text-sm font-medium text-foreground text-center">
              Inconnu
            </span>
          )}
          <UserRoleBadge roles={authorRoles} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceFromNowLocalized(post.created_at, language, true)}</span>
            {post.is_edited && (
              <span className="italic">({t.forum.edited})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isTopicLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onQuote?.(post)}
                className="h-7 px-2"
                title={t.forum.quote}
              >
                <Quote className="h-4 w-4" />
              </Button>
            )}
            {isAuthor && !isTopicLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-7 px-2"
                title={t.common.edit}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (!isTopicLocked || isModerator) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(post.id)}
                className="h-7 px-2 text-destructive hover:text-destructive"
                title={t.common.delete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {/* Report button - only for other users' posts */}
            {user && !isAuthor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportDialogOpen(true)}
                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                title={t.forum.report}
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quoted post */}
        {post.quoted_post && (
          <div className="mb-3 p-3 rounded-lg bg-muted/30 border-l-2 border-primary/50">
            <p className="text-xs text-muted-foreground mb-1">
              {t.forum.quoteFrom} {post.quoted_post.author?.username || t.forum.unknownUser}:
            </p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {post.quoted_post.content}
            </p>
          </div>
        )}

        {/* Content or editor */}
        {isEditing ? (
          <div className="space-y-2">
            <MarkdownEditor
              value={editContent}
              onChange={setEditContent}
              minHeight="100px"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 mr-1" />
                {t.common.save}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-1" />
                {t.common.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                // Custom renderer for mentions
                a: ({ href, children }) => {
                  // Check if this is a mention link (starts with /profile/)
                  if (href?.startsWith('/profile/')) {
                    return (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium text-sm cursor-pointer hover:bg-primary/30 transition-colors">
                        {children}
                      </span>
                    );
                  }
                  return (
                    <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Reactions */}
        {!isEditing && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <ReactionPicker
              reactions={post.reactions}
              onReaction={(reactionType) => onReaction?.(post.id, reactionType)}
              disabled={isTopicLocked || !user}
            />
          </div>
        )}
      </div>

      {/* Report dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        targetType="post"
        targetId={post.id}
      />

    </div>
  );
};
