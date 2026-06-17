import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
import { FilterBar, FilterSearchField, filterSelectTriggerClassName } from '@/components/ui/filter-controls';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Shield, 
  Pencil, 
  Trash2, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  PenLine
} from 'lucide-react';
import { toast } from 'sonner';
import { interpolateMessage } from '@/i18n/format';
import { toSlug } from '@/lib/guildSlug';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

interface Guild {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url: string | null;
  owner_id: string | null;
  created_at: string;
  // Counts come from guild_roster_cache; null means "roster not cached / unavailable".
  member_count?: number | null;
  unique_members?: number | null;
}

type SortKey = 'name' | 'server' | 'region' | 'faction' | 'member_count' | 'unique_members' | 'created_at';
type SortDirection = 'asc' | 'desc';

type MembersCacheFilter = 'all' | 'missing' | 'cached';

const formatServerName = (serverSlug: string) => {
  if (/[A-Z\s'\u2019]/.test(serverSlug)) {
    return serverSlug;
  }

  return serverSlug
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatFaction = (faction: string) => {
  return faction.charAt(0).toUpperCase() + faction.slice(1).toLowerCase();
};

const ITEMS_PER_PAGE = 10;

export function GuildManager() {
  const { t } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [totalCount, setTotalCount] = useState(0);
  const [membersCacheFilter, setMembersCacheFilter] = useState<MembersCacheFilter>('all');
  
  // Edit dialog state
  const [editingGuild, setEditingGuild] = useState<Guild | null>(null);
  const [editForm, setEditForm] = useState({ name: '', server: '', faction: '' });
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deletingGuild, setDeletingGuild] = useState<Guild | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Rename dialog state
  const [renamingGuild, setRenamingGuild] = useState<Guild | null>(null);
  const [renameNewName, setRenameNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  
  // Sync all state
  const [syncing, setSyncing] = useState(false);
  const [syncingGuildIds, setSyncingGuildIds] = useState<Record<string, boolean>>({});

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutId: number | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // Call with apikey header so the edge function accepts the request
      const invokePromise = supabase.functions.invoke('battlenet-auth/scheduled-sync', { body: {} });
      const { data, error } = await withTimeout(invokePromise, 25_000);
      
      if (error) throw error;

      // New behavior: backend returns immediately and continues in background
      if (data?.started) {
        toast.success(
          interpolateMessage(s('admin.guild_manager.sync_job'), { jobId: data.jobId })
        );
        return;
      }
      
      const users = data?.users || {};
      const guildsData = data?.guilds || {};
      
      toast.success(
        `${t.admin.syncComplete}: ${users.synced || 0} ${t.admin.users.toLowerCase()}, ${guildsData.synced || 0} ${t.admin.guildManagement.toLowerCase()} (${guildsData.skipped || 0} skipped)`
      );
      fetchGuilds();
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        toast.success(s('admin.guild_manager.sync_started'));
        return;
      }
      toast.error(t.admin.syncError);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncGuild = async (guild: Pick<Guild, 'id' | 'name'>) => {
    setSyncingGuildIds((prev) => ({ ...prev, [guild.id]: true }));
    try {
      // Fast path: refresh cached Blizzard guild members (guild_roster_cache) and return counts inline.
      const invokePromise = supabase.functions.invoke('battlenet-auth/guild-members-cache-sync', {
        body: { guildId: guild.id },
      });
      const { data, error } = await withTimeout(invokePromise, 25_000);
      if (error) throw error;

      const members = typeof data?.cachedMembers === 'number' ? data.cachedMembers : 0;
      const guildforce = typeof data?.cachedGuildforceUsers === 'number' ? data.cachedGuildforceUsers : 0;
      toast.success(
        interpolateMessage(s('admin.guild_manager.sync_members_done'), { members, guildforce })
      );

      // Best-effort refresh: if roster cache was updated quickly, counts will reflect it.
      fetchGuilds();
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        toast.success(s('admin.guild_manager.sync_started'));
        return;
      }
      toast.error(t.admin.syncError);
    } finally {
      setSyncingGuildIds((prev) => {
        const { [guild.id]: _ignored, ...rest } = prev;
        return rest;
      });
    }
  };

  const openRenameDialog = (guild: Guild) => {
    setRenamingGuild(guild);
    setRenameNewName('');
  };

  const handleRenameGuild = async () => {
    if (!renamingGuild) return;

    const newName = renameNewName.trim();
    if (!newName) {
      toast.error(s('admin.guild_manager.rename_missing_name', 'Please enter a new guild name'));
      return;
    }

    setRenaming(true);
    try {
      const invokePromise = supabase.functions.invoke('battlenet-auth/guild-rename', {
        body: { guildId: renamingGuild.id, newName },
      });
      const { data, error } = await withTimeout(invokePromise, 25_000);
      if (error) throw error;

      const cachedMembers = typeof data?.cachedMembers === 'number' ? data.cachedMembers : 0;
      const cachedGuildforceUsers = typeof data?.cachedGuildforceUsers === 'number' ? data.cachedGuildforceUsers : 0;

      toast.success(
        interpolateMessage(s('admin.guild_manager.rename_success'), {
          oldName: String(data?.oldName ?? renamingGuild.name),
          newName: String(data?.newName ?? newName),
          members: cachedMembers,
          guildforce: cachedGuildforceUsers,
        })
      );

      setRenamingGuild(null);
      setRenameNewName('');
      fetchGuilds();
    } catch (error) {
      if (error instanceof Error && error.message === 'timeout') {
        toast.success(s('admin.guild_manager.sync_started'));
        return;
      }
      toast.error(t.admin.syncError);
    } finally {
      setRenaming(false);
    }
  };

  const fetchGuilds = async () => {
    setLoading(true);
    try {
      // Determine if we can sort server-side (only for db columns, not computed)
      const dbSortableKeys: SortKey[] = ['name', 'server', 'region', 'faction', 'created_at'];
      const canSortServerSide = dbSortableKeys.includes(sortKey);
      const needsClientSide = !canSortServerSide || membersCacheFilter !== 'all';

      const applyFilter = (rows: Guild[]) => {
        if (membersCacheFilter === 'missing') {
          return rows.filter((g) => g.member_count == null);
        }
        if (membersCacheFilter === 'cached') {
          return rows.filter((g) => g.member_count != null);
        }
        return rows;
      };

      const sortClientSide = (rows: Guild[]) => {
        const missingLast = (a: unknown) => a === null || a === undefined;

        const compareNullable = (a: unknown, b: unknown) => {
          const aMissing = missingLast(a);
          const bMissing = missingLast(b);
          if (aMissing && bMissing) return 0;
          if (aMissing) return 1;
          if (bMissing) return -1;
          return null;
        };

        const direction = sortDirection === 'asc' ? 1 : -1;

        return [...rows].sort((a, b) => {
          const aVal = a[sortKey as keyof Guild];
          const bVal = b[sortKey as keyof Guild];
          const nullable = compareNullable(aVal, bVal);
          if (nullable !== null) return nullable;

          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction * (aVal - bVal);
          }

          // created_at is an ISO string
          if (sortKey === 'created_at' && typeof aVal === 'string' && typeof bVal === 'string') {
            return direction * aVal.localeCompare(bVal);
          }

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return direction * aVal.localeCompare(bVal);
          }

          return 0;
        });
      };

      // Client-side mode is used when filtering by cache status or sorting by computed columns.
      if (needsClientSide) {
        let query = supabase
          .from('guilds')
          .select('*')
          .order('created_at', { ascending: false });

        if (searchQuery) {
          query = query.or(`name.ilike.%${searchQuery}%,server.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const allRows = (data || []) as Guild[];
        if (allRows.length === 0) {
          setGuilds([]);
          setTotalCount(0);
          return;
        }

        const guildIds = allRows.map((g) => g.id);
        const { data: countsData } = await supabase
          .rpc('get_guild_member_counts', { p_guild_ids: guildIds });

        const countMap = new Map<string, { total: number; unique: number }>();
        countsData?.forEach((c: { guild_id: string; total_count: number; unique_users: number }) => {
          countMap.set(c.guild_id, { total: c.total_count, unique: c.unique_users });
        });

        const withCounts = allRows.map((g) => ({
          ...g,
          member_count: countMap.has(g.id) ? (countMap.get(g.id)?.total ?? 0) : null,
          unique_members: countMap.has(g.id) ? (countMap.get(g.id)?.unique ?? 0) : null,
        }));

        const filtered = applyFilter(withCounts);
        const sorted = sortClientSide(filtered);
        setTotalCount(sorted.length);

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        setGuilds(sorted.slice(start, start + ITEMS_PER_PAGE));
        return;
      }

      // Server-side mode: count + paginated fetch, then augment with counts for the current page.
      let countQuery = supabase
        .from('guilds')
        .select('*', { count: 'exact', head: true });

      if (searchQuery) {
        countQuery = countQuery.or(`name.ilike.%${searchQuery}%,server.ilike.%${searchQuery}%`);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      let query = supabase
        .from('guilds')
        .select('*')
        .order(sortKey, { ascending: sortDirection === 'asc' });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,server.ilike.%${searchQuery}%`);
      }

      query = query.range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        setGuilds([]);
        return;
      }

      const guildIds = data.map(g => g.id);
      const { data: countsData } = await supabase
        .rpc('get_guild_member_counts', { p_guild_ids: guildIds });

      const countMap = new Map<string, { total: number; unique: number }>();
      countsData?.forEach((c: { guild_id: string; total_count: number; unique_users: number }) => {
        countMap.set(c.guild_id, { total: c.total_count, unique: c.unique_users });
      });

      const guildsWithCounts = (data as Guild[]).map((g) => ({
        ...g,
        member_count: countMap.has(g.id) ? (countMap.get(g.id)?.total ?? 0) : null,
        unique_members: countMap.has(g.id) ? (countMap.get(g.id)?.unique ?? 0) : null,
      }));

      setGuilds(guildsWithCounts);
    } catch (error) {
      toast.error(t.admin.loadingError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuilds();
  }, [currentPage, searchQuery, sortKey, sortDirection, membersCacheFilter]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleMembersCacheFilterChange = (value: MembersCacheFilter) => {
    setMembersCacheFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const openEditDialog = (guild: Guild) => {
    setEditingGuild(guild);
    setEditForm({
      name: guild.name,
      server: guild.server,
      faction: guild.faction
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGuild) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('guilds')
        .update({
          name: editForm.name,
          server: editForm.server,
          faction: editForm.faction
        })
        .eq('id', editingGuild.id);
      
      if (error) throw error;
      
      toast.success(t.admin.guildUpdated);
      setEditingGuild(null);
      fetchGuilds();
    } catch (error) {
      toast.error(t.admin.guildUpdateError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGuild) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('guilds')
        .delete()
        .eq('id', deletingGuild.id);
      
      if (error) throw error;
      
      toast.success(t.admin.guildDeleted);
      setDeletingGuild(null);
      fetchGuilds();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message ? `${t.admin.guildDeleteError}: ${message}` : t.admin.guildDeleteError);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getFactionColor = (faction: string) => {
    switch (faction.toLowerCase()) {
      case 'alliance': return 'text-alliance';
      case 'horde': return 'text-horde';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Sync button */}
      <FilterBar className="mb-0">
        <FilterSearchField
          placeholder={t.admin.searchGuilds}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          containerClassName="min-w-[240px] flex-1"
        />
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            {s('admin.guild_manager.members_filter_label')}
          </Label>
          <Select value={membersCacheFilter} onValueChange={(v) => handleMembersCacheFilterChange(v as MembersCacheFilter)}>
            <SelectTrigger className={cn(filterSelectTriggerClassName, 'w-[220px]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{s('admin.guild_manager.members_filter_all')}</SelectItem>
              <SelectItem value="missing">{s('admin.guild_manager.members_filter_missing')}</SelectItem>
              <SelectItem value="cached">{s('admin.guild_manager.members_filter_cached')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncAll}
          disabled={syncing}
          className="gap-2 shrink-0"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t.admin.syncBattlenet}
        </Button>
      </FilterBar>

      {/* Table */}
      <GlowCard surface="section" className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  {t.admin.name}
                  <SortIcon columnKey="name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('server')}
              >
                <div className="flex items-center">
                  {t.admin.server}
                  <SortIcon columnKey="server" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('region')}
              >
                <div className="flex items-center">
                  {t.admin.region}
                  <SortIcon columnKey="region" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('faction')}
              >
                <div className="flex items-center">
                  {t.admin.faction}
                  <SortIcon columnKey="faction" />
                </div>
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('member_count')}
              >
                <div className="flex items-center justify-center">
                  <Users className="h-4 w-4" />
                  <SortIcon columnKey="member_count" />
                </div>
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('unique_members')}
              >
                <div className="flex items-center justify-center">
                  GF
                  <SortIcon columnKey="unique_members" />
                </div>
              </TableHead>
              <TableHead className="text-right">{s('admin.guild_manager.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="h-14">
                    <div className="animate-pulse bg-primary/10 h-4 rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : guilds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {t.admin.noGuildsFound}
                </TableCell>
              </TableRow>
            ) : (
              guilds.map((guild) => (
                <TableRow key={guild.id}>
                  <TableCell>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={guild.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        <Shield className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{guild.name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatServerName(guild.server)}</TableCell>
                  <TableCell className="text-muted-foreground uppercase text-xs">{guild.region}</TableCell>
                  <TableCell>
                    <span className={getFactionColor(guild.faction)}>
                      {formatFaction(guild.faction)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    <span title={guild.member_count == null ? s('guild.members.sync_missing') : undefined}>
                      {guild.member_count == null ? 'N/A' : guild.member_count}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    <span title={guild.unique_members == null ? s('guild.members.sync_missing') : undefined}>
                      {guild.unique_members == null ? 'N/A' : guild.unique_members}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSyncGuild(guild)}
                        disabled={!!syncingGuildIds[guild.id]}
                        title={s('admin.guild_manager.sync_guild', 'Sync guild')}
                      >
                        {syncingGuildIds[guild.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(`/guild/${guild.region.toLowerCase()}/${toSlug(guild.server)}/${toSlug(guild.name)}`, '_blank')}
                        title={t.admin.viewGuild}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(guild)}
                        title={t.common.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openRenameDialog(guild)}
                        title={s('admin.guild_manager.rename_action', 'Guild renamed')}
                      >
                        <PenLine className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingGuild(guild)}
                        title={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
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
            {totalCount} {t.admin.totalGuilds}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingGuild} onOpenChange={() => setEditingGuild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t.admin.editGuild}
            </DialogTitle>
            <DialogDescription>
              {t.admin.editGuildInfo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.admin.name}</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server">{t.admin.server}</Label>
              <Input
                id="server"
                value={editForm.server}
                onChange={(e) => setEditForm(f => ({ ...f, server: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faction">{t.admin.faction}</Label>
              <Select
                value={editForm.faction}
                onValueChange={(v) => setEditForm(f => ({ ...f, faction: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alliance">{t.guild.alliance}</SelectItem>
                  <SelectItem value="Horde">{t.guild.horde}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGuild(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? t.admin.saving : t.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renamingGuild} onOpenChange={() => setRenamingGuild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s('admin.guild_manager.rename_title', 'Guild renamed')}</DialogTitle>
            <DialogDescription>
              {interpolateMessage(
                s('admin.guild_manager.rename_desc'),
                { oldName: renamingGuild?.name || '' }
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename_new_name">{s('admin.guild_manager.rename_new_name_label', 'New name')}</Label>
              <Input
                id="rename_new_name"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder={s('admin.guild_manager.rename_new_name_placeholder', 'Enter the new guild name')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingGuild(null)} disabled={renaming}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleRenameGuild} disabled={renaming}>
              {renaming ? t.admin.saving : s('admin.guild_manager.rename_submit', 'Rename')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGuild} onOpenChange={() => setDeletingGuild(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.admin.deleteGuild}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.confirmDeleteGuild} "{deletingGuild?.name}"? {t.admin.deleteGuildWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? t.admin.deleting : t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

