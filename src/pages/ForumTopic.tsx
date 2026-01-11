import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumTopic, useForumPosts, useForumActions } from '@/hooks/useForum';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { ForumPost, MarkdownEditor } from '@/components/forum';
import { ForumPost as ForumPostType } from '@/types/forum';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Loader2, ArrowLeft, ChevronLeft, ChevronRight, Heart, Pin, Lock, 
  Edit3, Trash2, User, Clock, Eye, MessageSquare, Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
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

const ForumTopicPage = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const locale = language === 'fr' ? fr : enUS;

  const { topic, loading: topicLoading, refetch: refetchTopic } = useForumTopic(topicId || null);
  const [page, setPage] = useState(1);
  const { posts, totalCount, loading: postsLoading, refetch: refetchPosts } = useForumPosts(topicId || null, page);
  const { createPost, updatePost, deletePost, deleteTopic, updateTopic, toggleReaction } = useForumActions();

  const [replyContent, setReplyContent] = useState('');
  const [quotedPost, setQuotedPost] = useState<ForumPostType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'topic' | 'post'; id: string } | null>(null);

  const totalPages = Math.ceil(totalCount / 20);
  const isAuthor = user?.id === topic?.author_id;

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !topicId) return;

    setSubmitting(true);
    try {
      await createPost(topicId, replyContent.trim(), quotedPost?.id);
      toast.success(language === 'fr' ? 'Réponse publiée !' : 'Reply posted!');
      setReplyContent('');
      setQuotedPost(null);
      refetchPosts();
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la publication' : 'Error posting reply');
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
      toast.success(language === 'fr' ? 'Message modifié' : 'Post updated');
      refetchPosts();
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la modification' : 'Error updating post');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'topic') {
        await deleteTopic(deleteTarget.id);
        toast.success(language === 'fr' ? 'Sujet supprimé' : 'Topic deleted');
        navigate(`/forum/category/${topic?.category?.slug}`);
      } else {
        await deletePost(deleteTarget.id);
        toast.success(language === 'fr' ? 'Message supprimé' : 'Post deleted');
        refetchPosts();
      }
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting');
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
        ? (language === 'fr' ? 'Sujet désépinglé' : 'Topic unpinned')
        : (language === 'fr' ? 'Sujet épinglé' : 'Topic pinned')
      );
      refetchTopic();
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const handleToggleLock = async () => {
    if (!topic) return;
    try {
      await updateTopic(topic.id, { is_locked: !topic.is_locked });
      toast.success(topic.is_locked 
        ? (language === 'fr' ? 'Sujet déverrouillé' : 'Topic unlocked')
        : (language === 'fr' ? 'Sujet verrouillé' : 'Topic locked')
      );
      refetchTopic();
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const handleReaction = async (type: 'topic' | 'post', id: string) => {
    try {
      await toggleReaction(type, id);
      if (type === 'topic') refetchTopic();
      else refetchPosts();
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  if (topicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {language === 'fr' ? 'Sujet non trouvé' : 'Topic not found'}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {language === 'fr' ? 'Retour au forum' : 'Back to forum'}
          </CosmicButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/forum/category/${topic.category?.slug}`)}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {topic.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              {topic.is_locked && <Lock className="h-4 w-4 text-amber-500" />}
              <h1 className="font-display text-xl md:text-2xl text-foreground truncate">
                {topic.title}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {topic.category?.name}
            </p>
          </div>
          {isAuthor && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTogglePin}>
                <Pin className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleLock}>
                <Lock className="h-4 w-4" />
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
            </div>
          )}
        </div>

        {/* Original post */}
        <div className="mb-6 p-4 rounded-lg bg-card/50 border border-primary/30">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2 min-w-[80px]">
              <Avatar className="h-12 w-12">
                {topic.author?.avatar_url ? (
                  <AvatarImage src={topic.author.avatar_url} alt={topic.author.username} />
                ) : (
                  <AvatarFallback className="bg-primary/20 text-primary">
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-sm font-medium text-foreground text-center">
                {topic.author?.username || 'Inconnu'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {topic.view_count} vues
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {topic.reply_count} réponses
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction('topic', topic.id)}
                  className={`h-7 px-2 ${topic.user_has_reacted ? 'text-red-500' : ''}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${topic.user_has_reacted ? 'fill-current' : ''}`} />
                  {topic.reaction_count || 0}
                </Button>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{topic.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {language === 'fr' ? 'Réponses' : 'Replies'} ({totalCount})
          </h2>

          {postsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {language === 'fr' ? 'Aucune réponse pour le moment' : 'No replies yet'}
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
                onReaction={(id) => handleReaction('post', id)}
                isTopicLocked={topic.is_locked}
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
                {language === 'fr' ? 'Précédent' : 'Previous'}
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
                {language === 'fr' ? 'Suivant' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </CosmicButton>
            </div>
          )}
        </div>

        {/* Reply editor */}
        {user && !topic.is_locked && (
          <div id="reply-editor" className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {language === 'fr' ? 'Répondre' : 'Reply'}
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
                  {language === 'fr' ? 'En réponse à' : 'Replying to'} {quotedPost.author?.username}:
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {quotedPost.content}
                </p>
              </div>
            )}

            <MarkdownEditor
              value={replyContent}
              onChange={setReplyContent}
              placeholder={language === 'fr' ? 'Votre réponse...' : 'Your reply...'}
              minHeight="120px"
            />

            <div className="flex justify-end">
              <CosmicButton
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || submitting}
                loading={submitting}
                icon={<Send className="h-4 w-4" />}
              >
                {language === 'fr' ? 'Publier' : 'Post'}
              </CosmicButton>
            </div>
          </div>
        )}

        {topic.is_locked && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center">
            <Lock className="h-5 w-5 inline-block mr-2" />
            {language === 'fr' ? 'Ce sujet est verrouillé' : 'This topic is locked'}
          </div>
        )}
      </main>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Confirmer la suppression' : 'Confirm deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'topic'
                ? (language === 'fr' 
                    ? 'Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.'
                    : 'Are you sure you want to delete this topic? This action cannot be undone.')
                : (language === 'fr'
                    ? 'Êtes-vous sûr de vouloir supprimer ce message ?'
                    : 'Are you sure you want to delete this post?')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {language === 'fr' ? 'Supprimer' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ForumTopicPage;
