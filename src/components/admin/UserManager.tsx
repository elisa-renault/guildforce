import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'moderator' | 'user';

interface UserWithRoles {
  id: string;
  username: string;
  avatar_url: string | null;
  battletag: string | null;
  created_at: string;
  roles: AppRole[];
}

const ITEMS_PER_PAGE = 15;

export function UserManager() {
  const { language } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [togglingRole, setTogglingRole] = useState<{ userId: string; role: AppRole } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Get total count
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (searchQuery) {
        countQuery = countQuery.or(`username.ilike.%${searchQuery}%,battletag.ilike.%${searchQuery}%`);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated data
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, battletag, created_at')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,battletag.ilike.%${searchQuery}%`);
      }

      const { data: profiles, error } = await query;
      
      if (error) throw error;
      
      // Get roles for all fetched users
      if (profiles && profiles.length > 0) {
        const userIds = profiles.map(p => p.id);
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        
        const roleMap = new Map<string, AppRole[]>();
        roles?.forEach(r => {
          const existing = roleMap.get(r.user_id) || [];
          existing.push(r.role as AppRole);
          roleMap.set(r.user_id, existing);
        });

        setUsers(profiles.map(p => ({
          ...p,
          roles: roleMap.get(p.id) || []
        })));
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(language === 'fr' ? 'Erreur lors du chargement des utilisateurs' : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const toggleRole = async (userId: string, role: AppRole) => {
    // Prevent removing own admin role
    if (userId === currentUser?.id && role === 'admin') {
      toast.error(language === 'fr' 
        ? 'Vous ne pouvez pas retirer votre propre rôle admin' 
        : 'You cannot remove your own admin role'
      );
      return;
    }

    setTogglingRole({ userId, role });
    
    const user = users.find(u => u.id === userId);
    const hasRole = user?.roles.includes(role);

    try {
      if (hasRole) {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        
        if (error) throw error;
        
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, roles: u.roles.filter(r => r !== role) }
            : u
        ));
        
        toast.success(language === 'fr' 
          ? `Rôle ${role} retiré` 
          : `${role} role removed`
        );
      } else {
        // Add role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        
        if (error) throw error;
        
        setUsers(prev => prev.map(u => 
          u.id === userId 
            ? { ...u, roles: [...u.roles, role] }
            : u
        ));
        
        toast.success(language === 'fr' 
          ? `Rôle ${role} attribué` 
          : `${role} role assigned`
        );
      }
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la modification du rôle' : 'Error updating role');
    } finally {
      setTogglingRole(null);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'fr' ? 'Rechercher par nom ou battletag...' : 'Search by name or battletag...'}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <GlowCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{language === 'fr' ? 'Utilisateur' : 'User'}</TableHead>
              <TableHead>{language === 'fr' ? 'BattleTag' : 'BattleTag'}</TableHead>
              <TableHead>{language === 'fr' ? 'Inscription' : 'Joined'}</TableHead>
              <TableHead>{language === 'fr' ? 'Rôles' : 'Roles'}</TableHead>
              <TableHead className="text-right">{language === 'fr' ? 'Actions' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="h-14">
                    <div className="animate-pulse bg-muted/30 h-4 rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {language === 'fr' ? 'Aucun utilisateur trouvé' : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.username}
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">
                          {language === 'fr' ? 'Vous' : 'You'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.battletag || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {user.roles.includes('admin') && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                          <Crown className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {user.roles.includes('moderator') && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Mod
                        </Badge>
                      )}
                      {user.roles.length === 0 && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant={user.roles.includes('moderator') ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => toggleRole(user.id, 'moderator')}
                        disabled={togglingRole?.userId === user.id}
                      >
                        {togglingRole?.userId === user.id && togglingRole?.role === 'moderator' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-3 w-3" />
                        )}
                        Mod
                      </Button>
                      <Button
                        variant={user.roles.includes('admin') ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => toggleRole(user.id, 'admin')}
                        disabled={togglingRole?.userId === user.id || user.id === currentUser?.id}
                      >
                        {togglingRole?.userId === user.id && togglingRole?.role === 'admin' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Crown className="h-3 w-3" />
                        )}
                        Admin
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </GlowCard>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {language === 'fr' 
              ? `${totalCount} utilisateur${totalCount > 1 ? 's' : ''} au total`
              : `${totalCount} user${totalCount > 1 ? 's' : ''} total`
            }
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
