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
}

const ITEMS_PER_PAGE = 10;

export function GuildManager() {
  const { language } = useLanguage();
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
      const { data, error } = await supabase.functions.invoke('battlenet-auth', {
        body: { action: 'scheduled-sync' }
      });
      
      if (error) throw error;
      
      toast.success(
        language === 'fr' 
          ? `Synchronisation terminée : ${data?.usersProcessed || 0} utilisateurs, ${data?.guildsProcessed || 0} guildes` 
          : `Sync complete: ${data?.usersProcessed || 0} users, ${data?.guildsProcessed || 0} guilds`
      );
      fetchGuilds();
    } catch (error) {
      console.error('Error syncing all guilds:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la synchronisation' : 'Error during sync');
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
        const { data: memberCounts } = await supabase
          .from('guild_roster_cache')
          .select('guild_id')
          .in('guild_id', guildIds);
        
        const countMap = new Map<string, number>();
        memberCounts?.forEach(m => {
          countMap.set(m.guild_id, (countMap.get(m.guild_id) || 0) + 1);
        });

        setGuilds(data.map(g => ({
          ...g,
          member_count: countMap.get(g.id) || 0
        })));
      } else {
        setGuilds([]);
      }
    } catch (error) {
      console.error('Error fetching guilds:', error);
      toast.error(language === 'fr' ? 'Erreur lors du chargement des guildes' : 'Error loading guilds');
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
      
      toast.success(language === 'fr' ? 'Guilde modifiée' : 'Guild updated');
      setEditingGuild(null);
      fetchGuilds();
    } catch (error) {
      console.error('Error updating guild:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la modification' : 'Error updating guild');
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
      
      toast.success(language === 'fr' ? 'Guilde supprimée' : 'Guild deleted');
      setDeletingGuild(null);
      fetchGuilds();
    } catch (error) {
      console.error('Error deleting guild:', error);
      toast.error(language === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting guild');
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
            placeholder={language === 'fr' ? 'Rechercher une guilde...' : 'Search guilds...'}
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
          {language === 'fr' ? 'Sync Battle.net' : 'Sync Battle.net'}
        </Button>
      </div>

      {/* Table */}
      <GlowCard className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{language === 'fr' ? 'Nom' : 'Name'}</TableHead>
              <TableHead>{language === 'fr' ? 'Serveur' : 'Server'}</TableHead>
              <TableHead>{language === 'fr' ? 'Région' : 'Region'}</TableHead>
              <TableHead>{language === 'fr' ? 'Faction' : 'Faction'}</TableHead>
              <TableHead className="text-center">
                <Users className="h-4 w-4 inline" />
              </TableHead>
              <TableHead className="text-right">{language === 'fr' ? 'Actions' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="h-14">
                    <div className="animate-pulse bg-muted/30 h-4 rounded w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : guilds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {language === 'fr' ? 'Aucune guilde trouvée' : 'No guilds found'}
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
                  <TableCell className="text-muted-foreground">{guild.server}</TableCell>
                  <TableCell className="text-muted-foreground uppercase text-xs">{guild.region}</TableCell>
                  <TableCell>
                    <span className={getFactionColor(guild.faction)}>
                      {guild.faction}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {guild.member_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(`/guild/${guild.region.toLowerCase()}/${toSlug(guild.server)}/${toSlug(guild.name)}`, '_blank')}
                        title={language === 'fr' ? 'Voir la guilde' : 'View guild'}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(guild)}
                        title={language === 'fr' ? 'Modifier' : 'Edit'}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingGuild(guild)}
                        title={language === 'fr' ? 'Supprimer' : 'Delete'}
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
            {language === 'fr' 
              ? `${totalCount} guilde${totalCount > 1 ? 's' : ''} au total`
              : `${totalCount} guild${totalCount > 1 ? 's' : ''} total`
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

      {/* Edit Dialog */}
      <Dialog open={!!editingGuild} onOpenChange={() => setEditingGuild(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'fr' ? 'Modifier la guilde' : 'Edit Guild'}
            </DialogTitle>
            <DialogDescription>
              {language === 'fr' 
                ? 'Modifiez les informations de la guilde.'
                : 'Update guild information.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{language === 'fr' ? 'Nom' : 'Name'}</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="server">{language === 'fr' ? 'Serveur' : 'Server'}</Label>
              <Input
                id="server"
                value={editForm.server}
                onChange={(e) => setEditForm(f => ({ ...f, server: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faction">Faction</Label>
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
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving 
                ? (language === 'fr' ? 'Enregistrement...' : 'Saving...') 
                : (language === 'fr' ? 'Enregistrer' : 'Save')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGuild} onOpenChange={() => setDeletingGuild(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'fr' ? 'Supprimer la guilde ?' : 'Delete guild?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'fr' 
                ? `Êtes-vous sûr de vouloir supprimer "${deletingGuild?.name}" ? Cette action est irréversible et supprimera toutes les données associées (membres, vœux, sondages, etc.).`
                : `Are you sure you want to delete "${deletingGuild?.name}"? This action is irreversible and will delete all associated data (members, wishes, polls, etc.).`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting 
                ? (language === 'fr' ? 'Suppression...' : 'Deleting...') 
                : (language === 'fr' ? 'Supprimer' : 'Delete')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
