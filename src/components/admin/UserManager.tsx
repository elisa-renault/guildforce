import { useMemo, useState, useEffect } from 'react';
import log from '@/lib/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BattleNetRegion, REGION_LABELS } from '@/lib/battlenetOAuth';
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeLocalized, formatPluralMessage, interpolateMessage } from '@/i18n/format';

type AppRole = 'admin' | 'moderator' | 'user';
type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'username'
  | 'battletag'
  | 'created_at'
  | 'updated_at'
  | 'preferred_language'
  | 'main_character_name'
  | 'region'
  | 'roles';

interface UserWithRoles {
  id: string;
  username: string;
  avatar_url: string | null;
  battletag: string | null;
  created_at: string;
  updated_at: string;
  preferred_language: string;
  main_character_name: string | null;
  roles: AppRole[];
  region: string | null;
}

const ITEMS_PER_PAGE = 15;

export function UserManager() {
  const { language, t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [togglingRole, setTogglingRole] = useState<{ userId: string; role: AppRole } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getNextSortDirection = (key: SortKey) => {
    if (key === sortKey) {
      return sortDirection === 'asc' ? 'desc' : 'asc';
    }
    if (key === 'created_at' || key === 'updated_at') {
      return 'desc';
    }
    return 'asc';
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Determine if we can sort server-side (only for db columns, not computed like region/roles)
      const dbSortableKeys: SortKey[] = ['username', 'battletag', 'created_at', 'updated_at', 'preferred_language', 'main_character_name'];
      const canSortServerSide = dbSortableKeys.includes(sortKey);

      // Get total count
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (searchQuery) {
        countQuery = countQuery.or(`username.ilike.%${searchQuery}%,battletag.ilike.%${searchQuery}%`);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Build query
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, battletag, created_at, updated_at, preferred_language, main_character_name');
      
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,battletag.ilike.%${searchQuery}%`);
      }

      // For server-sortable columns, apply order + pagination server-side
      if (canSortServerSide) {
        query = query.order(sortKey, { ascending: sortDirection === 'asc' });
        query = query.range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      } else {
        // For computed columns (region, roles), we need all data to sort properly
        query = query.order('created_at', { ascending: false });
      }

      const { data: profiles, error } = await query;
      
      if (error) throw error;
      
      if (!profiles || profiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Get roles and regions for all fetched users
      const userIds = profiles.map(p => p.id);

      const [{ data: roles }, { data: regions }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds),
        supabase
          .from('battlenet_tokens')
          .select('user_id, region')
          .in('user_id', userIds)
      ]);
      
      const roleMap = new Map<string, AppRole[]>();
      roles?.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });

      const regionMap = new Map<string, string>();
      regions?.forEach(r => {
        if (r.region) {
          regionMap.set(r.user_id, r.region);
        }
      });

      let usersWithData = profiles.map(p => ({
        ...p,
        roles: roleMap.get(p.id) || [],
        region: regionMap.get(p.id) || null
      }));

      // For computed columns, sort client-side then paginate
      if (!canSortServerSide) {
        const direction = sortDirection === 'asc' ? 1 : -1;
        usersWithData.sort((a, b) => {
          let aValue = '';
          let bValue = '';
          
          if (sortKey === 'region') {
            aValue = (a.region || '').toLowerCase();
            bValue = (b.region || '').toLowerCase();
          } else if (sortKey === 'roles') {
            // Sort by highest role: admin > moderator > user
            const getRolePriority = (userRoles: AppRole[]) => {
              if (userRoles.includes('admin')) return 'a';
              if (userRoles.includes('moderator')) return 'b';
              return 'c';
            };
            aValue = getRolePriority(a.roles);
            bValue = getRolePriority(b.roles);
          }
          
          if (aValue < bValue) return -direction;
          if (aValue > bValue) return direction;
          return 0;
        });
        
        // Apply client-side pagination
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        usersWithData = usersWithData.slice(start, start + ITEMS_PER_PAGE);
      }

      setUsers(usersWithData);
    } catch (error) {
      log.error('Error fetching users:', error);
      toast.error(t.auto.components_admin_UserManager_198);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, sortDirection, sortKey]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    const nextDirection = getNextSortDirection(key);
    setSortKey(key);
    setSortDirection(nextDirection);
    setCurrentPage(1);
  };

  const toggleRole = async (userId: string, role: AppRole) => {
    // Prevent removing own admin role
    if (userId === currentUser?.id && role === 'admin') {
      toast.error(t.auto.components_admin_UserManager_223
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
        
        const removedTemplate = t.auto?.components_admin_UserManager_role_removed;
        toast.success(
          removedTemplate ? interpolateMessage(removedTemplate, { role }) : role
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
        
        const assignedTemplate = t.auto?.components_admin_UserManager_role_assigned;
        toast.success(
          assignedTemplate ? interpolateMessage(assignedTemplate, { role }) : role
        );
      }
    } catch (error) {
      log.error('Error toggling role:', error);
      toast.error(t.auto.components_admin_UserManager_277);
    } finally {
      setTogglingRole(null);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDateTime = (dateStr: string) => {
    return formatDateTimeLocalized(dateStr, language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLanguage = (lang?: string) => {
    if (!lang) return '-';
    return lang.toUpperCase();
  };

  const formatRegion = (region?: string | null) => {
    if (!region) return '-';
    const normalized = region.toLowerCase() as BattleNetRegion;
    return REGION_LABELS[normalized] || region.toUpperCase();
  };

  const formatServerName = (serverSlug: string) => {
    return serverSlug
      .split('-')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatMainCharacter = (value: string | null) => {
    if (!value) return '-';
    if (!value.includes('-')) return value;
    const [name, ...serverParts] = value.split('-');
    if (serverParts.length === 0) return value;
    const server = formatServerName(serverParts.join('-'));
    return `${name} — ${server}`;
  };

  const getRolesLabel = (roles: AppRole[]) => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('moderator')) return 'moderator';
    return '';
  };

  // Sorting is now handled in fetchUsers (server-side for db columns, client-side for computed columns)
  // No need for additional client-side sorting here

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  const headerButtonClass =
    'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <label htmlFor="user-search" className="sr-only">
          {t.auto.components_admin_UserManager_349}
        </label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="user-search"
          name="user-search"
          placeholder={t.auto.components_admin_UserManager_355}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <GlowCard className="overflow-x-auto">
        <Table className="w-full min-w-[960px] text-xs md:text-sm lg:min-w-[1120px] xl:min-w-[1240px]">
          <TableHeader className="[&_th]:h-10 [&_th]:px-2 sm:[&_th]:px-3">
            <TableRow>
              <TableHead className="w-[44px]"></TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('username')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'username' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_375}
                  {sortIcon('username')}
                </button>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort('battletag')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'battletag' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_386}
                  {sortIcon('battletag')}
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort('region')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'region' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_397}
                  {sortIcon('region')}
                </button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort('created_at')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'created_at' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_408}
                  {sortIcon('created_at')}
                </button>
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort('updated_at')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'updated_at' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_419}
                  {sortIcon('updated_at')}
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort('preferred_language')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'preferred_language' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_430}
                  {sortIcon('preferred_language')}
                </button>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <button
                  type="button"
                  onClick={() => handleSort('main_character_name')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'main_character_name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_441}
                  {sortIcon('main_character_name')}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort('roles')}
                  className={headerButtonClass}
                  aria-sort={sortKey === 'roles' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {t.auto.components_admin_UserManager_452}
                  {sortIcon('roles')}
                </button>
              </TableHead>
              <TableHead className="text-right">{t.auto.components_admin_UserManager_456}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_td]:px-2 [&_td]:py-2 sm:[&_td]:px-3 md:[&_td]:py-3">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10} className="h-14">
                    <div className="animate-pulse bg-primary/10 h-4 rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  {t.auto.components_admin_UserManager_471}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar className="h-7 w-7 md:h-8 md:w-8">
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
                          {t.auto.components_admin_UserManager_490}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {user.battletag || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs md:text-sm">
                    {formatRegion(user.region)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs md:text-sm">
                    {formatDateTime(user.created_at)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs md:text-sm">
                    {formatDateTime(user.updated_at)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs md:text-sm">
                    {formatLanguage(user.preferred_language)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs md:text-sm">
                    {user.main_character_name ? (
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">
                          {user.main_character_name.split('-')[0]}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatServerName(user.main_character_name.split('-').slice(1).join('-'))}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
                        {t.common.admin}
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
            {formatPluralMessage({
              language,
              count: totalCount,
              forms: {
                one: t.auto?.components_admin_UserManager_total_users_single || '{{count}} user',
                other: t.auto?.components_admin_UserManager_total_users_plural || '{{count}} users',
              },
            })}
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
