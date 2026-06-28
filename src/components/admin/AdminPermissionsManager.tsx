import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { FilterSearchField } from '@/components/ui/filter-controls';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Shield, ShieldCheck, User, X, Plus } from 'lucide-react';
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

type AppRole = 'admin' | 'moderator' | 'user';

interface UserWithRoles {
  id: string;
  username: string;
  avatar_url: string | null;
  roles: AppRole[];
}

export const AdminPermissionsManager = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithRoles[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'add' | 'remove';
    user: UserWithRoles | null;
    role: AppRole;
  }>({ open: false, action: 'add', user: null, role: 'user' });

  const fetchUsersWithRoles = async () => {
    setLoading(true);
    try {
      // Get all users with admin or moderator roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'moderator']);

      if (rolesError) throw rolesError;

      // Group roles by user
      const userRolesMap = new Map<string, AppRole[]>();
      rolesData?.forEach(r => {
        const existing = userRolesMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        userRolesMap.set(r.user_id, existing);
      });

      // Get profiles for these users
      const userIds = Array.from(userRolesMap.keys());
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const usersWithRolesData: UserWithRoles[] = (profiles || []).map(p => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          roles: userRolesMap.get(p.id) || [],
        }));

        // Sort: admins first, then moderators
        usersWithRolesData.sort((a, b) => {
          const aIsAdmin = a.roles.includes('admin');
          const bIsAdmin = b.roles.includes('admin');
          if (aIsAdmin && !bIsAdmin) return -1;
          if (!aIsAdmin && bIsAdmin) return 1;
          return a.username.localeCompare(b.username);
        });

        setUsersWithRoles(usersWithRolesData);
      } else {
        setUsersWithRoles([]);
      }
    } catch (error) {
      toast.error(t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (profiles) {
        // Get roles for found users
        const userIds = profiles.map(p => p.id);
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        const userRolesMap = new Map<string, AppRole[]>();
        rolesData?.forEach(r => {
          const existing = userRolesMap.get(r.user_id) || [];
          existing.push(r.role as AppRole);
          userRolesMap.set(r.user_id, existing);
        });

        const results: UserWithRoles[] = profiles.map(p => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          roles: userRolesMap.get(p.id) || [],
        }));

        setSearchResults(results);
      }
    } catch (error) {
      // Search error handled silently
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const confirmRoleChange = (user: UserWithRoles, role: AppRole, action: 'add' | 'remove') => {
    setConfirmDialog({ open: true, action, user, role });
  };

  const executeRoleChange = async () => {
    if (!confirmDialog.user) return;

    setSaving(true);
    try {
      const { user, role, action } = confirmDialog;

      if (action === 'add') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role });

        if (error) throw error;
        toast.success(t.admin.roleAdded);
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', role);

        if (error) throw error;
        toast.success(t.admin.roleRemoved);
      }

      // Refresh the list
      await fetchUsersWithRoles();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error(t.errors.generic);
    } finally {
      setSaving(false);
      setConfirmDialog({ open: false, action: 'add', user: null, role: 'user' });
    }
  };

  const getRoleBadge = (role: AppRole) => {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="bg-status-error/20 text-status-error border-status-error/30">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-status-info/20 text-status-info border-status-info/30">
        <Shield className="h-3 w-3 mr-1" />
        {t.admin.moderators}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <GlowCard surface="section">
        <h2 className="text-lg font-medium text-foreground mb-4">
          {t.admin.roleManagement}
        </h2>

        <div>
          <FilterSearchField
            id="admin-search-user"
            name="admin-search-user"
            placeholder={t.common.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="w-full"
          />
        </div>

        {searching && (
          <div className="mt-4 space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!searching && searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{user.username}</span>
                  <div className="flex gap-1">
                    {user.roles.map((role) => (
                      <span key={role}>{getRoleBadge(role)}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!user.roles.includes('moderator') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => confirmRoleChange(user, 'moderator', 'add')}
                      className="text-status-info border-status-info/30 hover:bg-status-info/10"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t.admin.moderators}
                    </Button>
                  )}
                  {!user.roles.includes('admin') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => confirmRoleChange(user, 'admin', 'add')}
                      className="text-status-error border-status-error/30 hover:bg-status-error/10"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Admin
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowCard>

      <GlowCard surface="section">
        <h2 className="text-lg font-medium text-foreground mb-4">
          {t.admin.users}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : usersWithRoles.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {t.permissions.noRules}
          </p>
        ) : (
          <div className="space-y-2">
            {usersWithRoles.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium text-foreground">{user.username}</span>
                    <div className="flex gap-1 mt-1">
                      {user.roles.map((role) => (
                        <span key={role}>{getRoleBadge(role)}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.roles.includes('moderator') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirmRoleChange(user, 'moderator', 'remove')}
                      className="text-muted-foreground hover:text-status-error"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {user.roles.includes('admin') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => confirmRoleChange(user, 'admin', 'remove')}
                      className="text-muted-foreground hover:text-status-error"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowCard>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'add' ? t.admin.roleManagement : t.common.confirmDelete}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.actionIrreversible}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeRoleChange} disabled={saving}>
              {saving ? t.common.processing : t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

