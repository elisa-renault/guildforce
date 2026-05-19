import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories, useForumActions } from '@/hooks/useForum';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageContainer } from '@/components/layout/PageContainer';
import { MarkdownEditor } from '@/components/forum';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';

const ForumNewTopic = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useForumCategories();
  const { createTopic } = useForumActions();
  const sm = (key: Parameters<typeof resolveSemanticMessage>[0]['key']) =>
    resolveSemanticMessage({ key, language, translations: t });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  const category = categories.find(c => c.slug === categorySlug);

  const handleCreateTopic = async () => {
    if (!category || !title.trim() || !content.trim()) return;

    setCreating(true);
    try {
      const topic = await createTopic(category.id, title.trim(), content.trim());
      toast.success(sm('forum.new_topic.toast.created'));
      navigate(`/forum/topic/${topic.id}`);
    } catch (error) {
      toast.error(sm('forum.new_topic.toast.create_error'));
    } finally {
      setCreating(false);
    }
  };

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {sm('forum.new_topic.auth_required')}
          </p>
          <CosmicButton onClick={() => navigate('/auth')}>
            {sm('forum.new_topic.login')}
          </CosmicButton>
        </div>
      </div>
    );
  }

  if (categoriesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            {sm('forum.new_topic.category_not_found')}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {sm('forum.new_topic.back_to_forum')}
          </CosmicButton>
        </div>
      </div>
    );
  }

  const categoryName = t.forum.categoryNames[category.slug as keyof typeof t.forum.categoryNames] || category.name;

  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 max-w-3xl py-8" width="app">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: 'Forum', href: '/forum' },
            { label: categoryName, href: `/forum/category/${categorySlug}` },
            { label: sm('forum.new_topic.title') },
          ]}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex items-start gap-3 mb-8">
          <button
            onClick={() => navigate(`/forum/category/${categorySlug}`)}
            aria-label={sm('forum.new_topic.back_to_category')}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-foreground">
              {sm('forum.new_topic.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {interpolateMessage(sm('forum.new_topic.in_category'), { categoryName })}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6 bg-card/50 border border-border/50 rounded-xl p-6">
          <div>
            <label htmlFor="topic-title" className="block text-sm font-medium text-foreground mb-2">
              {sm('forum.new_topic.field_title')}
            </label>
            <Input
              id="topic-title"
              name="topic-title"
              placeholder={sm('forum.new_topic.title_placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label htmlFor="topic-content" className="block text-sm font-medium text-foreground mb-2">
              {sm('forum.new_topic.field_content')}
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder={sm('forum.new_topic.content_placeholder')}
              minHeight="300px"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <CosmicButton
              variant="outline"
              onClick={() => navigate(`/forum/category/${categorySlug}`)}
            >
              {t.common.cancel}
            </CosmicButton>
            <CosmicButton
              onClick={handleCreateTopic}
              disabled={!title.trim() || !content.trim() || creating}
              loading={creating}
            >
              {t.forum.createTopic || sm('forum.new_topic.create')}
            </CosmicButton>
          </div>
        </div>
      </PageContainer>
    </div>
  );
};

export default ForumNewTopic;
