import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories } from '@/hooks/useForum';
import { useIsAdmin } from '@/hooks/useAdmin';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { ForumCategoryList } from '@/components/forum';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, MessageSquare, Settings } from 'lucide-react';

const Forum = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
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
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-foreground flex items-center gap-3">
              <MessageSquare className="h-8 w-8" />
              Forum
            </h1>
            <p className="text-muted-foreground mt-1">
              {t.forum.subtitle || 'Community discussions and updates'}
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => navigate('/forum/admin')}
              className="border-border hover:bg-muted"
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive mb-6">
            {error}
          </div>
        )}

        <ForumCategoryList categories={categories} />

        {/* Empty state with call to action */}
        {categories.length === 0 && !loading && (
          <div className="text-center py-16">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t.forum.empty?.noCategories || (t.auto.pages_Forum_72)}
            </h2>
            <p className="text-muted-foreground">
              {t.forum.empty?.beingSetUp || (t.auto.pages_Forum_75)}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Forum;
