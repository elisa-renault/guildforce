import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories, useForumTopics } from '@/hooks/useForum';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ForumTopicList } from '@/components/forum';
import { PageContainer } from '@/components/layout/PageContainer';
import { Loader2, Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

const ForumCategory = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useForumCategories();
  const [page, setPage] = useState(1);

  const category = categories.find(c => c.slug === categorySlug);
  const { topics, totalCount, loading: topicsLoading } = useForumTopics(category?.id || null, page);

  const totalPages = Math.ceil(totalCount / 20);

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
            {t.forum.categoryNotFound}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {t.forum.backToForum}
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
            { label: t.forum.categoryNames[category.slug as keyof typeof t.forum.categoryNames] || category.name },
          ]}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/forum')}
              aria-label={t.forum.backToForum}
              className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl text-foreground">
                {t.forum.categoryNames[category.slug as keyof typeof t.forum.categoryNames] || category.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t.forum.categoryDescriptions[category.slug as keyof typeof t.forum.categoryDescriptions] || category.description}
              </p>
            </div>
          </div>
          {user && (
            <CosmicButton 
              onClick={() => navigate(`/forum/category/${categorySlug}/new`)} 
              icon={<Plus className="h-4 w-4" />}
              className="w-full sm:w-auto sm:self-end"
            >
              {t.forum.newTopic}
            </CosmicButton>
          )}
        </div>

        {/* Topics */}
        {topicsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <ForumTopicList topics={topics} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <CosmicButton
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="h-4 w-4" />}
                >
                  {t.forum.previous}
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
                  {t.common.next}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </CosmicButton>
              </div>
            )}
          </>
        )}
      </PageContainer>
    </div>
  );
};

export default ForumCategory;
