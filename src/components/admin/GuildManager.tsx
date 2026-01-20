import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { Button } from '@/components/ui/button';
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
  Search, 
  Pencil, 
  Trash2, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { toSlug } from '@/lib/guildSlug';

interface Guild {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url: string | null;
  owner_id: string | null;
  created_at: string;
  member_count?: number;
  unique_members?: number;
}

const formatServerName = (serverSlug: string) => {
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
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Edit dialog state
  const [editingGuild, setEditingGuild] = useState<Guild | null>(null);
  const [editForm, setEditForm] = useState({ name: '', server: '', faction: '' });
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deletingGuild, setDeletingGuild] = useState<Guild | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Sync all state
  const [syncing, setSyncing] = useState(false);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // Call with apikey header so the edge function accepts the request
      const { data, error } = await supabase.functions.invoke('battlenet-auth/scheduled-sync', {
        body: {},
      });
      
      if (error) throw error;
      
      const users = data?.users || {};
      const guildsData = data?.guilds || {};
      
      toast.success(
        `${t.admin.syncComplete}: ${users.synced || 0} ${t.admin.users.toLowerCase()}, ${guildsData.synced || 0} ${t.admin.guildManagement.toLowerCase()} (${guildsData.skipped || 0} skipped)`
      );
      fetchGuilds();
    } catch (error) {
      toast.error(t.admin.syncError);
    } finally {
      setSyncing(false);
    }
  };

  const fetchGuilds = async () => {
    setLoading(true);
    try {
      // Get total count
      let countQuery = supabase
        .from('guilds')
        .select('*', { count: 'exact', head: true });
      
      if (searchQuery) {
        countQuery = countQuery.or(`name.ilike.%${searchQuery}%,server.ilike.%${searchQuery}%`);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated data
      let query = supabase
        .from('guilds')
        .select('*')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,server.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get member counts for each guild
      if (data && data.length > 0) {
        const guildIds = data.map(g => g.id);
        const { data: rosterData } = await supabase
          .from('guild_roster_cache')
          .select('guild_id, matched_user_id')
          .in('guild_id', guildIds);
        
        const countMap = new Map<string, number>();
        const uniqueMap = new Map<string, Set<string>>();
        
        rosterData?.forEach(m => {
          // Total character count
          countMap.set(m.guild_id, (countMap.get(m.guild_id) || 0) + 1);
          // Unique users count
          if (m.matched_user_id) {
            if (!uniqueMap.has(m.guild_id)) {
              uniqueMap.set(m.guild_id, new Set());
            }
            uniqueMap.get(m.guild_id)!.add(m.matched_user_id);
          }
        });

        setGuilds(data.map(g => ({
          ...g,
          member_count: countMap.get(g.id) || 0,
          unique_members: uniqueMap.get(g.id)?.size || 0
        })));
      } else {
        setGuilds([]);
      }
    } catch (error) {
      toast.error(t.admin.loadingError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuilds();
  }, [currentPage, searchQuery]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
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
    } catch (error) {
      toast.error(t.admin.guildDeleteError);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getFactionColor = (faction: string) => {
    switch (faction.toLowerCase()) {
      case 'alliance': return 'text-blue-400';
      case 'horde': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Sync button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.admin.searchGuilds}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
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
      </div>

      {/* Table */}
      <GlowCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{t.admin.name}</TableHead>
              <TableHead>{t.admin.server}</TableHead>
              <TableHead>{t.admin.region}</TableHead>
              <TableHead>{t.admin.faction}</TableHead>
              <TableHead className="text-center">
                <Users className="h-4 w-4 inline" />
              </TableHead>
              <TableHead className="text-center">GF</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                    {guild.member_count}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {guild.unique_members}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  <SelectItem value="Alliance">Alliance</SelectItem>
                  <SelectItem value="Horde">Horde</SelectItem>
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
