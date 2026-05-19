import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForumCategories } from '@/hooks/useForum';
import { useIsAdmin } from '@/hooks/useAdmin';
import { CosmicBackground } from '@/components/CosmicBackground';
import { ForumCategoryList } from '@/components/forum';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Settings } from 'lucide-react';

const Forum = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { categories, loading, error } = useForumCategories();
  const { isAdmin } = useIsAdmin();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 space-y-6 py-8" width="app">
        <PageHeader
          icon={MessageSquare}
          title={t.forum.title}
          description={t.forum.subtitle}
          titleClassName="font-display"
          actions={isAdmin ? (
            <Button
              variant="outline"
              onClick={() => navigate('/forum/admin')}
              className="border-border hover:bg-muted"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t.common.admin}
            </Button>
          ) : null}
        />

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <ForumCategoryList categories={categories} />

        {/* Empty state with call to action */}
        {categories.length === 0 && !loading && (
          <EmptyState
            icon={MessageSquare}
            title={t.forum.empty.noCategories}
            description={t.forum.empty.beingSetUp}
          />
        )}
      </PageContainer>
    </div>
  );
};

export default Forum;
