import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAdminActions } from '@/hooks/useAdmin';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Loader2, ArrowLeft, Plus, Trash2, Edit3, User, Shield, 
  MessageSquare, Settings, Users, ChevronUp, ChevronDown, Flag, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { DynamicIcon, ReportsManager, SanctionsManager } from '@/components/forum';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_global: boolean;
}

interface Moderator {
  id: string;
  user_id: string;
  category_id: string | null;
  guild_id: string | null;
  is_global_mod: boolean;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

interface UserWithRoles {
  id: string;
  username: string;
  avatar_url: string | null;
  roles: ('admin' | 'moderator' | 'user')[];
}

const ForumAdmin = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const {
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    fetchModerators,
    addModerator,
    removeModerator,
    fetchAllUsers,
    addRole,
    removeRole,
  } = useAdminActions();

  const [categories, setCategories] = useState<Category[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '',
    display_order: 0,
  });

  // Moderator dialog state
  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'moderator'; id: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, mods, allUsers] = await Promise.all([
        fetchCategories(),
        fetchModerators(),
        fetchAllUsers(),
      ]);
      setCategories(cats || []);
      setModerators(mods || []);
      setUsers(allUsers || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error(language === 'fr' ? 'Erreur de chargement' : 'Loading error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadData();
    }
  }, [adminLoading, isAdmin]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {language === 'fr' ? 'Accès réservé aux administrateurs' : 'Admin access only'}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {language === 'fr' ? 'Retour au forum' : 'Back to forum'}
          </CosmicButton>
        </div>
      </div>
    );
  }

  const handleOpenCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        icon: category.icon || '',
        color: category.color || '',
        display_order: category.display_order,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        icon: '',
        color: '',
        display_order: categories.length,
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) {
      toast.error(language === 'fr' ? 'Nom et slug requis' : 'Name and slug required');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success(language === 'fr' ? 'Catégorie mise à jour' : 'Category updated');
      } else {
        await createCategory({ ...categoryForm, is_global: true });
        toast.success(language === 'fr' ? 'Catégorie créée' : 'Category created');
      }
      setCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget || deleteTarget.type !== 'category') return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success(language === 'fr' ? 'Catégorie supprimée' : 'Category deleted');
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const newCategories = [...categories];
    const [moved] = newCategories.splice(index, 1);
    newCategories.splice(newIndex, 0, moved);

    // Optimistic update
    setCategories(newCategories);

    try {
      await reorderCategories(newCategories.map(c => c.id));
      toast.success(language === 'fr' ? 'Ordre mis à jour' : 'Order updated');
    } catch (error) {
      console.error('Error reordering categories:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
      loadData(); // Revert on error
    }
  };

  const handleAddModerator = async () => {
    if (!selectedUserId) return;
    try {
      await addModerator(selectedUserId, { isGlobalMod: true });
      toast.success(language === 'fr' ? 'Modérateur ajouté' : 'Moderator added');
      setModDialogOpen(false);
      setSelectedUserId('');
      loadData();
    } catch (error) {
      console.error('Error adding moderator:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const handleRemoveModerator = async () => {
    if (!deleteTarget || deleteTarget.type !== 'moderator') return;
    try {
      await removeModerator(deleteTarget.id);
      toast.success(language === 'fr' ? 'Modérateur retiré' : 'Moderator removed');
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Error removing moderator:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const handleToggleRole = async (userId: string, role: 'admin' | 'moderator', hasRole: boolean) => {
    try {
      if (hasRole) {
        await removeRole(userId, role);
        toast.success(language === 'fr' ? 'Rôle retiré' : 'Role removed');
      } else {
        await addRole(userId, role);
        toast.success(language === 'fr' ? 'Rôle ajouté' : 'Role added');
      }
      loadData();
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error(language === 'fr' ? 'Erreur' : 'Error');
    }
  };

  const nonModeratorUsers = users.filter(
    (u) => !moderators.some((m) => m.user_id === u.id)
  );

  return (
    <div className="min-h-screen relative pt-16">
      <CosmicBackground />

      <main className="container mx-auto px-4 py-8 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/forum')}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl text-foreground">
              {language === 'fr' ? 'Administration du Forum' : 'Forum Administration'}
            </h1>
          </div>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="reports" className="data-[state=active]:bg-primary/20">
              <Flag className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Signalements' : 'Reports'}
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-primary/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Catégories' : 'Categories'}
            </TabsTrigger>
            <TabsTrigger value="moderators" className="data-[state=active]:bg-primary/20">
              <Shield className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Modérateurs' : 'Moderators'}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/20">
              <Users className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Utilisateurs' : 'Users'}
            </TabsTrigger>
            <TabsTrigger value="sanctions" className="data-[state=active]:bg-primary/20">
              <Ban className="h-4 w-4 mr-2" />
              {language === 'fr' ? 'Sanctions' : 'Sanctions'}
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportsManager />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  {language === 'fr' ? 'Catégories du forum' : 'Forum Categories'}
                </CardTitle>
                <Button onClick={() => handleOpenCategoryDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Ajouter' : 'Add'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((cat, index) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Reorder buttons */}
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleMoveCategory(index, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleMoveCategory(index, 'down')}
                            disabled={index === categories.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <DynamicIcon name={cat.icon || ''} fallback="📁" className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground capitalize">
                            {t.forum.categoryNames[cat.slug as keyof typeof t.forum.categoryNames] || cat.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{cat.slug}</p>
                        </div>
                        {cat.is_global && (
                          <Badge variant="outline" className="text-xs">
                            Global
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenCategoryDialog(cat)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ type: 'category', id: cat.id })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {language === 'fr' ? 'Aucune catégorie' : 'No categories'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderators Tab */}
          <TabsContent value="moderators">
            <Card className="bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  {language === 'fr' ? 'Modérateurs du forum' : 'Forum Moderators'}
                </CardTitle>
                <Button onClick={() => setModDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Ajouter' : 'Add'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {moderators.map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={mod.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{mod.profiles.username}</p>
                          <div className="flex gap-2">
                            {mod.is_global_mod && (
                              <Badge variant="secondary" className="text-xs">
                                {language === 'fr' ? 'Global' : 'Global'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ type: 'moderator', id: mod.id })}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {moderators.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      {language === 'fr' ? 'Aucun modérateur' : 'No moderators'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-lg">
                  {language === 'fr' ? 'Gestion des rôles' : 'Role Management'}
                </CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-xs">Admin</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? 'Accès total : gestion des catégories, modérateurs, et tous les rôles utilisateurs'
                        : 'Full access: manage categories, moderators, and all user roles'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs bg-primary/20">
                        <Shield className="h-3 w-3 mr-1" />
                        Modérateur
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'fr' 
                        ? 'Modération du forum : épingler, verrouiller et supprimer les sujets/messages'
                        : 'Forum moderation: pin, lock, and delete topics/posts'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{u.username}</p>
                            {u.id === user?.id && (
                              <Badge variant="outline" className="text-xs">
                                {language === 'fr' ? 'Vous' : 'You'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            {u.roles.includes('admin') && (
                              <Badge variant="destructive" className="text-xs">
                                Admin
                              </Badge>
                            )}
                            {u.roles.includes('moderator') && (
                              <Badge variant="secondary" className="text-xs bg-primary/20">
                                <Shield className="h-3 w-3 mr-1" />
                                Mod
                              </Badge>
                            )}
                            {u.roles.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                {language === 'fr' ? 'Utilisateur' : 'User'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={u.roles.includes('moderator') ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleRole(u.id, 'moderator', u.roles.includes('moderator'))}
                          disabled={u.id === user?.id}
                          className={u.roles.includes('moderator') ? 'bg-primary/20 hover:bg-primary/30' : 'border-border'}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Mod
                        </Button>
                        <Button
                          variant={u.roles.includes('admin') ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleRole(u.id, 'admin', u.roles.includes('admin'))}
                          disabled={u.id === user?.id}
                          className={!u.roles.includes('admin') ? 'border-border' : ''}
                        >
                          Admin
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sanctions Tab */}
          <TabsContent value="sanctions">
            <SanctionsManager />
          </TabsContent>
        </Tabs>
      </main>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? (language === 'fr' ? 'Modifier la catégorie' : 'Edit Category')
                : (language === 'fr' ? 'Nouvelle catégorie' : 'New Category')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Nom' : 'Name'}</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="General Discussion"
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="general"
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Description..."
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Icône (emoji)' : 'Icon (emoji)'}</Label>
                <Input
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="💬"
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Ordre' : 'Order'}</Label>
                <Input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                  className="bg-muted/50 border-border"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="border-border">
              {t.common.cancel}
            </Button>
            <Button onClick={handleSaveCategory}>
              {t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderator Dialog */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Ajouter un modérateur' : 'Add Moderator'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Utilisateur' : 'User'}</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder={language === 'fr' ? 'Sélectionner...' : 'Select...'} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {nonModeratorUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModDialogOpen(false)} className="border-border">
              {t.common.cancel}
            </Button>
            <Button onClick={handleAddModerator} disabled={!selectedUserId}>
              {language === 'fr' ? 'Ajouter' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Confirmer la suppression' : 'Confirm Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr'
                ? 'Cette action est irréversible.'
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-muted">
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTarget?.type === 'category' ? handleDeleteCategory : handleRemoveModerator}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ForumAdmin;
