import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories } from '@/hooks/useForum';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { ForumCategoryList } from '@/components/forum';
import { Loader2, Plus, MessageSquare } from 'lucide-react';

const Forum = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { categories, loading, error } = useForumCategories();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl gradient-text flex items-center gap-3">
              <MessageSquare className="h-8 w-8" />
              Forum
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'fr' 
                ? 'Discussions et échanges avec la communauté'
                : 'Community discussions and exchanges'}
            </p>
          </div>
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
              {language === 'fr' ? 'Aucune catégorie' : 'No categories'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'fr' 
                ? 'Le forum est en cours de configuration.'
                : 'The forum is being set up.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Forum;
