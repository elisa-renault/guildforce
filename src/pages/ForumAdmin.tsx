import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin, useAdminActions } from '@/hooks/useAdmin';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { CosmicBackground } from '@/components/CosmicBackground';
import { CosmicButton } from '@/components/CosmicButton';
import { PageContainer } from '@/components/layout/PageContainer';
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
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
      toast.error(t.admin.loadingError);
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
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <div className="text-center">
          <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {t.admin.accessRestricted}
          </p>
          <CosmicButton onClick={() => navigate('/forum')}>
            {t.admin.backToForum}
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
      toast.error(t.admin.nameAndSlugRequired);
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success(t.admin.categoryUpdated);
      } else {
        await createCategory({ ...categoryForm, is_global: true });
        toast.success(t.admin.categoryCreated);
      }
      setCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error(t.errors.generic);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget || deleteTarget.type !== 'category') return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success(t.admin.categoryDeleted);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      toast.error(t.errors.generic);
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
      toast.success(t.admin.orderUpdated);
    } catch (error) {
      toast.error(t.errors.generic);
      loadData(); // Revert on error
    }
  };

  const handleAddModerator = async () => {
    if (!selectedUserId) return;
    try {
      await addModerator(selectedUserId, { isGlobalMod: true });
      toast.success(t.admin.moderatorAdded);
      setModDialogOpen(false);
      setSelectedUserId('');
      loadData();
    } catch (error) {
      toast.error(t.errors.generic);
    }
  };

  const handleRemoveModerator = async () => {
    if (!deleteTarget || deleteTarget.type !== 'moderator') return;
    try {
      await removeModerator(deleteTarget.id);
      toast.success(t.admin.moderatorRemoved);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      toast.error(t.errors.generic);
    }
  };

  const handleToggleRole = async (userId: string, role: 'admin' | 'moderator', hasRole: boolean) => {
    try {
      if (hasRole) {
        await removeRole(userId, role);
        toast.success(t.admin.roleRemoved);
      } else {
        await addRole(userId, role);
        toast.success(t.admin.roleAdded);
      }
      loadData();
    } catch (error) {
      toast.error(t.errors.generic);
    }
  };

  const nonModeratorUsers = users.filter(
    (u) => !moderators.some((m) => m.user_id === u.id)
  );

  return (
    <div className="flex-1 relative">
      <CosmicBackground />

      <PageContainer as="main" className="relative z-10 py-8" width="app">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/forum')}
            aria-label={t.admin.backToForum}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl text-foreground">
              {t.admin.forumAdmin}
            </h1>
          </div>
        </div>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="reports" className="data-[state=active]:bg-primary/20">
              <Flag className="h-4 w-4 mr-2" />
              {t.admin.reports}
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-primary/20">
              <MessageSquare className="h-4 w-4 mr-2" />
              {t.admin.categories}
            </TabsTrigger>
            <TabsTrigger value="moderators" className="data-[state=active]:bg-primary/20">
              <Shield className="h-4 w-4 mr-2" />
              {t.admin.moderators}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary/20">
              <Users className="h-4 w-4 mr-2" />
              {t.admin.users}
            </TabsTrigger>
            <TabsTrigger value="sanctions" className="data-[state=active]:bg-primary/20">
              <Ban className="h-4 w-4 mr-2" />
              {t.admin.sanctions}
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
                  {t.admin.forumCategories}
                </CardTitle>
                <Button onClick={() => handleOpenCategoryDialog()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.common.add}
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
                            {t.admin.global}
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
                      {t.admin.noCategories}
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
                  {t.admin.forumModerators}
                </CardTitle>
                <Button onClick={() => setModDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.common.add}
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
                                {t.admin.global}
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
                      {t.admin.noModerators}
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
                  {t.admin.roleManagement}
                </CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-xs">{t.common.admin}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.admin.adminRoleDesc}
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
                      {t.admin.modRoleDesc}
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
                                {t.admin.you}
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
                                {t.admin.user}
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
      </PageContainer>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t.admin.editCategory : t.admin.newCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">{t.admin.name}</Label>
              <Input
                id="category-name"
                name="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder={s('forum.admin.category.name_placeholder')}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">{s('forum.admin.category.slug_label')}</Label>
              <Input
                id="category-slug"
                name="category-slug"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder={s('forum.admin.category.slug_placeholder')}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">{s('forum.admin.category.description_label')}</Label>
              <Textarea
                id="category-description"
                name="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder={s('forum.admin.category.description_placeholder')}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category-icon">{t.admin.icon}</Label>
                <Input
                  id="category-icon"
                  name="category-icon"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder={s('forum.admin.category.icon_placeholder')}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-order">{t.admin.order}</Label>
                <Input
                  id="category-order"
                  name="category-order"
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
              {t.admin.addModerator}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.admin.user}</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder={t.admin.selectUser} />
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
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.admin.confirmDeletion}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.actionIrreversible}
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
