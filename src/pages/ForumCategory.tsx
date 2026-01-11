import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories, useForumTopics, useForumActions } from '@/hooks/useForum';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { ForumTopicList, MarkdownEditor } from '@/components/forum';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const ForumCategory = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useForumCategories();
  const [page, setPage] = useState(1);
  const [showNewTopicDialog, setShowNewTopicDialog] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [creating, setCreating] = useState(false);

  const category = categories.find(c => c.slug === categorySlug);
  const { topics, totalCount, loading: topicsLoading, refetch } = useForumTopics(category?.id || null, page);
  const { createTopic } = useForumActions();

  const totalPages = Math.ceil(totalCount / 20);

  const handleCreateTopic = async () => {
    if (!category || !newTopicTitle.trim() || !newTopicContent.trim()) return;

    setCreating(true);
    try {
      const topic = await createTopic(category.id, newTopicTitle.trim(), newTopicContent.trim());
      toast.success(language === 'fr' ? 'Sujet créé !' : 'Topic created!');
      setShowNewTopicDialog(false);
      setNewTopicTitle('');
      setNewTopicContent('');
      navigate(`/forum/topic/${topic.id}`);
    } catch (error) {
      toast.error(language === 'fr' ? 'Erreur lors de la création' : 'Error creating topic');
    } finally {
      setCreating(false);
    }
  };

  if (categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/forum')}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl text-foreground">{category.name}</h1>
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
          </div>
          {user && (
            <CosmicButton onClick={() => setShowNewTopicDialog(true)} icon={<Plus className="h-4 w-4" />}>
              {language === 'fr' ? 'Nouveau sujet' : 'New topic'}
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
          </>
        )}
      </main>

      {/* New Topic Dialog */}
      <Dialog open={showNewTopicDialog} onOpenChange={setShowNewTopicDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Nouveau sujet' : 'New topic'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder={language === 'fr' ? 'Titre du sujet' : 'Topic title'}
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="text-lg"
              />
            </div>
            <MarkdownEditor
              value={newTopicContent}
              onChange={setNewTopicContent}
              placeholder={language === 'fr' ? 'Contenu de votre message...' : 'Your message content...'}
              minHeight="200px"
            />
          </div>
          <DialogFooter>
            <CosmicButton
              variant="outline"
              onClick={() => setShowNewTopicDialog(false)}
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </CosmicButton>
            <CosmicButton
              onClick={handleCreateTopic}
              disabled={!newTopicTitle.trim() || !newTopicContent.trim() || creating}
              loading={creating}
            >
              {language === 'fr' ? 'Créer le sujet' : 'Create topic'}
            </CosmicButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ForumCategory;
