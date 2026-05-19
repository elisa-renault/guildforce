import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumTopic, useForumPosts, useForumActions } from '@/hooks/useForum';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useIsModerator } from '@/hooks/useAdmin';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ForumPost, MarkdownEditor, ReactionPicker, UserRoleBadge, TopicSubscriptionButton, ReportDialog, UserContextMenu } from '@/components/forum';
import { PageContainer } from '@/components/layout/PageContainer';
import { ForumPost as ForumPostType, ReactionType } from '@/types/forum';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Loader2, ChevronLeft, ChevronRight, Pin, Lock, 
  Trash2, User, Clock, Eye, MessageSquare, Flag, Send
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceFromNowLocalized } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';

const ForumTopicPage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const { topic, loading: topicLoading, refetch: refetchTopic, refreshReactions: refreshTopicReactions } = useForumTopic(topicId || null);
  const [page, setPage] = useState(1);
  const { posts, totalCount, loading: postsLoading, refetch: refetchPosts, refreshPostReactions } = useForumPosts(topicId || null, page);
  const { createPost, updatePost, deletePost, deleteTopic, updateTopic, toggleReaction } = useForumActions();
  const { isModerator } = useIsModerator();

  const [replyContent, setReplyContent] = useState('');
  const [quotedPost, setQuotedPost] = useState<ForumPostType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'topic' | 'post'; id: string } | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  const totalPages = Math.ceil(totalCount / 20);
  const isAuthor = user?.id === topic?.author_id;
  const canModerate = isAuthor || isModerator;

  // Get author roles for badge display
  const authorIds = useMemo(() => topic?.author_id ? [topic.author_id] : [], [topic?.author_id]);
  const { roles: authorRolesMap } = useUserRoles(authorIds);
  const topicAuthorRoles = topic?.author_id ? (authorRolesMap.get(topic.author_id) || []) : [];

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !topicId) return;

    setSubmitting(true);
    try {
      await createPost(topicId, replyContent.trim(), quotedPost?.id);
      toast.success(sm('forum.topic.toast.reply_created'));
      setReplyContent('');
      setQuotedPost(null);
      refetchPosts();
    } catch (error) {
      toast.error(sm('forum.topic.toast.reply_create_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuote = (post: ForumPostType) => {
    setQuotedPost(post);
    // Scroll to reply editor
    document.getElementById('reply-editor')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEditPost = async (postId: string, content: string) => {
    try {
      await updatePost(postId, content);
      toast.success(sm('forum.topic.toast.reply_updated'));
      refetchPosts();
    } catch (error) {
      toast.error(sm('forum.topic.toast.reply_update_error'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'topic') {
        await deleteTopic(deleteTarget.id);
        toast.success(sm('forum.topic.toast.topic_deleted'));
        navigate(`/forum/category/${topic?.category?.slug}`);
      } else {
        await deletePost(deleteTarget.id);
        toast.success(sm('forum.topic.toast.reply_deleted'));
        refetchPosts();
      }
    } catch (error) {
      toast.error(sm('forum.topic.toast.delete_error'));
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleTogglePin = async () => {
    if (!topic) return;
    try {
      await updateTopic(topic.id, { is_pinned: !topic.is_pinned });
      toast.success(topic.is_pinned 
        ? sm('forum.topic.toast.unpinned')
        : sm('forum.topic.toast.pinned')
      );
      refetchTopic();
    } catch (error) {
      toast.error(sm('forum.topic.toast.pin_error'));
    }
  };

  const handleToggleLock = async () => {
    if (!topic) return;
    try {
      await updateTopic(topic.id, { is_locked: !topic.is_locked });
      toast.success(topic.is_locked 
        ? sm('forum.topic.toast.unlocked')
        : sm('forum.topic.toast.locked')
      );
      refetchTopic();
    } catch (error) {
      toast.error(sm('forum.topic.toast.lock_error'));
    }
  };

  const handleReaction = async (type: 'topic' | 'post', id: string, reactionType: ReactionType = 'like') => {
    try {
      await toggleReaction(type, id, reactionType);
      // No need to refetch - realtime will handle it
    } catch (error) {
      toast.error(sm('forum.topic.toast.reaction_error'));
    }
  };

  // Subscribe to realtime reaction updates (without triggering full reloads)
  useEffect(() => {
    if (!topicId) return;

    const channel = supabase
      .channel(`reactions-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_reactions',
        },
        (payload) => {
          const next = payload.new as { topic_id?: string | null; post_id?: string | null } | null;
          const prev = payload.old as { topic_id?: string | null; post_id?: string | null } | null;

          const changedTopicId = (next?.topic_id ?? prev?.topic_id) || null;
          const changedPostId = (next?.post_id ?? prev?.post_id) || null;

          if (changedTopicId && changedTopicId === topicId) {
            refreshTopicReactions();
          }

          if (changedPostId) {
            refreshPostReactions(changedPostId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, refreshTopicReactions, refreshPostReactions]);

  if (topicLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {t.forum?.topicNotFound}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {t.forum?.backToForum}
          </CosmicButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 py-8" width="app">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: 'Forum', href: '/forum' },
            { 
              label: topic.category?.slug 
                ? (t.forum.categoryNames[topic.category.slug as keyof typeof t.forum.categoryNames] || topic.category.name)
                : (topic.category?.name || ''),
              href: `/forum/category/${topic.category?.slug}` 
            },
            { label: topic.title },
          ]}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button
            onClick={() => navigate(`/forum/category/${topic.category?.slug}`)}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {topic.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              {topic.is_locked && <Lock className="h-4 w-4 text-warning" />}
              <h1 className="font-display text-xl md:text-2xl text-foreground truncate">
                {topic.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && topicId && (
              <TopicSubscriptionButton topicId={topicId} variant="button" />
            )}
            {/* Report button - for all logged-in users (except author) */}
            {user && !isAuthor && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setReportDialogOpen(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
            {/* Moderation actions - for author and moderators */}
            {canModerate && (
              <>
                <Button variant="outline" size="sm" onClick={handleTogglePin}>
                  <Pin className={`h-4 w-4 ${topic.is_pinned ? 'text-primary' : ''}`} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToggleLock}>
                  <Lock className={`h-4 w-4 ${topic.is_locked ? 'text-warning' : ''}`} />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteTarget({ type: 'topic', id: topic.id });
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Original post */}
        <div className="mb-6 p-4 rounded-lg bg-card/50 border border-primary/30">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              {topic.author ? (
                <UserContextMenu 
                  user={{
                    id: topic.author_id,
                    username: topic.author.username,
                    avatar_url: topic.author.avatar_url,
                  }} 
                  isModerator={isModerator}
                >
                  <Avatar className="h-12 w-12 hover:ring-2 hover:ring-primary/50 transition-all">
                    {topic.author.avatar_url ? (
                      <AvatarImage src={topic.author.avatar_url} alt={topic.author.username} />
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
                {topic.author ? (
                  <UserContextMenu 
                    user={{
                      id: topic.author_id,
                      username: topic.author.username,
                      avatar_url: topic.author.avatar_url,
                    }} 
                    isModerator={isModerator}
                  >
                    <span className="text-sm font-medium text-foreground text-center hover:text-primary transition-colors">
                      {topic.author.username}
                    </span>
                  </UserContextMenu>
                ) : (
                  <span className="text-sm font-medium text-foreground text-center">
                    {t.forum.unknownUser}
                  </span>
                )}
                <UserRoleBadge roles={topicAuthorRoles} size="sm" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceFromNowLocalized(topic.created_at, language, true)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {topic.view_count} {t.forum.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {topic.reply_count} {t.forum.replies}
                  </span>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => {
                      const childText = String(children);
                      if (childText.startsWith('@')) {
                        return (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium text-sm">
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
                  {topic.content}
                </ReactMarkdown>
              </div>
              {/* Topic reactions */}
              <div className="mt-3 pt-3 border-t border-border/30">
                <ReactionPicker
                  reactions={topic.reactions}
                  onReaction={(reactionType) => handleReaction('topic', topic.id, reactionType)}
                  disabled={topic.is_locked || !user}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t.forum?.replies} ({totalCount})
          </h2>

          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t.forum?.noReplies}
            </p>
          ) : (
            posts.map((post) => (
              <ForumPost
                key={post.id}
                post={post}
                onQuote={handleQuote}
                onEdit={handleEditPost}
                onDelete={(id) => {
                  setDeleteTarget({ type: 'post', id });
                  setDeleteDialogOpen(true);
                }}
                onReaction={(id, reactionType) => handleReaction('post', id, reactionType)}
                isTopicLocked={topic.is_locked}
                isModerator={isModerator}
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <CosmicButton
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                {t.forum?.previous}
              </CosmicButton>
              <span className="text-sm text-muted-foreground px-4">
                {page} / {totalPages}
              </span>
              <CosmicButton
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                {t.common?.next}
                <ChevronRight className="h-4 w-4 ml-1" />
              </CosmicButton>
            </div>
          )}
        </div>

        {/* Reply editor */}
        {user && !topic.is_locked && (
          <div id="reply-editor" className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t.forum?.reply}
            </h3>

            {quotedPost && (
              <div className="p-3 rounded-lg bg-muted/30 border-l-2 border-primary/50 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => setQuotedPost(null)}
                >
                  ×
                </Button>
                <p className="text-xs text-muted-foreground mb-1">
                  {t.forum?.replyingTo} {quotedPost.author?.username}:
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quotedPost.content}
                </p>
              </div>
            )}

            <MarkdownEditor
              value={replyContent}
              onChange={setReplyContent}
              placeholder={t.forum?.writeReply}
              minHeight="120px"
            />

            <div className="flex justify-end">
              <CosmicButton
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || submitting}
                loading={submitting}
                icon={<Send className="h-4 w-4" />}
              >
                {t.forum?.postReply}
              </CosmicButton>
            </div>
          </div>
        )}

        {topic.is_locked && (
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-warning text-center">
            <Lock className="h-5 w-5 inline-block mr-2" />
            {t.forum?.topicLocked}
          </div>
        )}
      </PageContainer>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.common?.confirmDelete}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'topic'
                ? t.forum?.confirmDeleteTopic
                : t.forum?.confirmDeletePost
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted">
              {t.common?.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {t.common?.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report dialog */}
      {topicId && (
        <ReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          targetType="topic"
          targetId={topicId}
        />
      )}
    </div>
  );
};

export default ForumTopicPage;
