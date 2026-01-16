import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories, useForumActions } from '@/hooks/useForum';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MarkdownEditor } from '@/components/forum';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const ForumNewTopic = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useForumCategories();
  const { createTopic } = useForumActions();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  const category = categories.find(c => c.slug === categorySlug);

  const handleCreateTopic = async () => {
    if (!category || !title.trim() || !content.trim()) return;

    setCreating(true);
    try {
      const topic = await createTopic(category.id, title.trim(), content.trim());
      toast.success(language === 'fr' ? 'Sujet créé !' : 'Topic created!');
      navigate(`/forum/topic/${topic.id}`);
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la création' : 'Error creating topic');
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
            {language === 'fr' ? 'Connectez-vous pour créer un sujet' : 'Log in to create a topic'}
          </p>
          <CosmicButton onClick={() => navigate('/auth')}>
            {language === 'fr' ? 'Se connecter' : 'Log in'}
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
            {language === 'fr' ? 'Catégorie non trouvée' : 'Category not found'}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {language === 'fr' ? 'Retour au forum' : 'Back to forum'}
          </CosmicButton>
        </div>
      </div>
    );
  }

  const categoryName = t.forum.categoryNames[category.slug as keyof typeof t.forum.categoryNames] || category.name;

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-3xl">
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: 'Forum', href: '/forum' },
            { label: categoryName, href: `/forum/category/${categorySlug}` },
            { label: language === 'fr' ? 'Nouveau sujet' : 'New topic' },
          ]}
          className="mb-4"
        />

        {/* Header */}
        <div className="flex items-start gap-3 mb-8">
          <button
            onClick={() => navigate(`/forum/category/${categorySlug}`)}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0 mt-1"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl text-foreground">
              {language === 'fr' ? 'Nouveau sujet' : 'New topic'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'fr' ? `Dans ${categoryName}` : `In ${categoryName}`}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6 bg-card/50 border border-border/50 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {language === 'fr' ? 'Titre' : 'Title'}
            </label>
            <Input
              placeholder={language === 'fr' ? 'Titre du sujet' : 'Topic title'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {language === 'fr' ? 'Contenu' : 'Content'}
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder={language === 'fr' ? 'Contenu de votre message...' : 'Your message content...'}
              minHeight="300px"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <CosmicButton
              variant="outline"
              onClick={() => navigate(`/forum/category/${categorySlug}`)}
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </CosmicButton>
            <CosmicButton
              onClick={handleCreateTopic}
              disabled={!title.trim() || !content.trim() || creating}
              loading={creating}
            >
              {language === 'fr' ? 'Créer le sujet' : 'Create topic'}
            </CosmicButton>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ForumNewTopic;
