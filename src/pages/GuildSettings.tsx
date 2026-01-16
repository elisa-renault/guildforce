import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CosmicBackground } from '@/components/CosmicBackground';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { GuildSubNav } from '@/components/guild';
import { RosterManager } from '@/components/roster';

import { GuildPermissionsEditor } from '@/components/permissions';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Upload, Trash2, Shield, Info, RefreshCw } from 'lucide-react';
import { toSlug, getGuildPath } from '@/lib/guildSlug';
import { BattleNetIcon } from '@/components/BattleNetIcon';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface GuildData {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url: string | null;
}

interface AccessRule {
  id: string;
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

interface Roster {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  access_rules: AccessRule[];
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

const GuildSettings = () => {
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const [searchParams] = useSearchParams();
  const initialRosterId = searchParams.get('roster');
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [ranks, setRanks] = useState<GuildRank[]>([]);

  const loadRostersAndMembers = async (guildId: string) => {
    // Load rosters with access rules
    const { data: rostersData } = await supabase
      .from('rosters')
      .select('*')
      .eq('guild_id', guildId)
      .order('is_default', { ascending: false })
      .order('created_at');

    if (rostersData) {
      // Load access rules for each roster
      const rostersWithRules: Roster[] = await Promise.all(
        rostersData.map(async (roster) => {
          const { data: rulesData } = await supabase
            .from('roster_access_rules')
            .select('*')
            .eq('roster_id', roster.id);

          return {
            id: roster.id,
            name: roster.name,
            description: roster.description,
            is_default: roster.is_default,
            access_rules: (rulesData || []).map(r => ({
              id: r.id,
              access_type: r.access_type as 'user' | 'rank',
              user_id: r.user_id ?? undefined,
              min_rank_index: r.min_rank_index ?? undefined,
              max_rank_index: r.max_rank_index ?? undefined,
            })),
          };
        })
      );
      setRosters(rostersWithRules);
    }

    // Load guild members with usernames
    const { data: membersData } = await supabase
      .from('guild_members')
      .select('user_id')
      .eq('guild_id', guildId);

    if (membersData) {
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const membersWithNames: GuildMember[] = membersData.map(m => ({
        user_id: m.user_id,
        username: profilesData?.find(p => p.id === m.user_id)?.username || 'Unknown',
      }));
      setMembers(membersWithNames);
    }

    // Load guild ranks from wow_guild_memberships
    const { data: guildData } = await supabase
      .from('guilds')
      .select('name, server, region')
      .eq('id', guildId)
      .single();

    if (guildData) {
      const { data: ranksData } = await supabase
        .from('wow_guild_memberships')
        .select('rank_index, rank_name')
        .ilike('guild_name', guildData.name)
        .ilike('guild_realm_slug', guildData.server)
        .ilike('guild_region', guildData.region);

      if (ranksData) {
        // Deduplicate ranks
        const uniqueRanks = new Map<number, string>();
        ranksData.forEach(r => {
          if (!uniqueRanks.has(r.rank_index)) {
            uniqueRanks.set(r.rank_index, r.rank_name || `Rank ${r.rank_index}`);
          }
        });

        const ranksArray: GuildRank[] = Array.from(uniqueRanks.entries())
          .map(([rank_index, rank_name]) => ({ rank_index, rank_name }))
          .sort((a, b) => a.rank_index - b.rank_index);
        
        setRanks(ranksArray);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadGuildAndCheckAccess = async () => {
      // Find the guild by matching slugified region, server and name
      const { data: allGuilds } = await supabase
        .from('guilds')
        .select('id, name, server, region, faction, avatar_url');
      
      const matchedGuild = allGuilds?.find(g => 
        toSlug(g.region || 'eu') === regionSlug && 
        toSlug(g.server) === serverSlug && 
        toSlug(g.name) === guildSlug
      );
      
      if (!matchedGuild) {
        navigate('/guilds');
        return;
      }

      // Check if user is GM
      const { data: isOwnerOrGM } = await supabase.rpc('is_guild_owner_or_gm', {
        _guild_id: matchedGuild.id
      });

      if (!isOwnerOrGM) {
        // Not a GM, redirect to dashboard
        navigate(getGuildPath(matchedGuild.region || 'eu', matchedGuild.server, matchedGuild.name));
        return;
      }

      setGuild(matchedGuild);
      setIsGM(true);
      
      // Load rosters, members, and ranks
      await loadRostersAndMembers(matchedGuild.id);
      
      setLoading(false);
    };

    loadGuildAndCheckAccess();
  }, [user, regionSlug, serverSlug, guildSlug, navigate]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !guild) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: t.guildSettings.uploadError,
        description: t.guildSettings.avatarHint,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: t.guildSettings.uploadError,
        description: t.guildSettings.avatarHint,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Generate file path
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${guild.id}/avatar.${ext}`;

      // Delete existing avatar if any
      if (guild.avatar_url) {
        const oldPath = guild.avatar_url.split('/guild-avatars/')[1]?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('guild-avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('guild-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: urlData } = supabase.storage
        .from('guild-avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update guild record
      const { error: updateError } = await supabase
        .from('guilds')
        .update({ avatar_url: avatarUrl })
        .eq('id', guild.id);

      if (updateError) throw updateError;

      setGuild({ ...guild, avatar_url: avatarUrl });
      toast({ title: t.guildSettings.avatarUpdated });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: t.guildSettings.uploadError,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!guild || !guild.avatar_url) return;

    setRemoving(true);

    try {
      // Delete from storage
      const oldPath = guild.avatar_url.split('/guild-avatars/')[1]?.split('?')[0];
      if (oldPath) {
        await supabase.storage.from('guild-avatars').remove([oldPath]);
      }

      // Update guild record
      const { error: updateError } = await supabase
        .from('guilds')
        .update({ avatar_url: null })
        .eq('id', guild.id);

      if (updateError) throw updateError;

      setGuild({ ...guild, avatar_url: null });
      toast({ title: t.guildSettings.avatarRemoved });
    } catch (error: any) {
      console.error('Remove error:', error);
      toast({
        title: t.errors.generic,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleResyncBattlenet = async () => {
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('battlenet-auth/resync', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        // Check if this is a token expiration error
        const errorMessage = error.message || '';
        const isTokenExpired = errorMessage.includes('expired') || errorMessage.includes('401');
        
        toast({
          title: isTokenExpired ? t.guildSettings.resyncTokenExpired : t.guildSettings.resyncError,
          variant: 'destructive',
        });
        return;
      }

      // Reload data after sync
      if (guild) {
        await loadRostersAndMembers(guild.id);
        
        // Reload guild data for faction update
        const { data: updatedGuild } = await supabase
          .from('guilds')
          .select('id, name, server, region, faction, avatar_url')
          .eq('id', guild.id)
          .single();
        
        if (updatedGuild) {
          setGuild(updatedGuild);
        }
      }

      toast({ title: t.guildSettings.resyncSuccess });
    } catch (error: any) {
      console.error('Resync error:', error);
      const errorMessage = error?.message || '';
      const isTokenExpired = errorMessage.includes('expired') || errorMessage.includes('401');
      
      toast({
        title: isTokenExpired ? t.guildSettings.resyncTokenExpired : t.guildSettings.resyncError,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <CosmicBackground />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guild || !isGM) {
    return null;
  }

  const basePath = `/guild/${regionSlug}/${serverSlug}/${guildSlug}`;

  return (
    <div className="flex-1 relative pt-16">
      <CosmicBackground />

      {/* Guild Sub-Navigation */}
      <GuildSubNav
        guild={guild}
        basePath={basePath}
        isGM={isGM}
        activeTab="settings"
      />

      <main className="container mx-auto px-4 py-6 relative z-10 max-w-7xl">
        {/* Top Section: Avatar + Guild Info side by side on desktop, stacked on mobile */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Avatar Section */}
          <GlowCard className="p-6">
            <h2 className="font-display text-lg mb-4">{t.guildSettings.avatar}</h2>
            
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-28 w-28 lg:h-32 lg:w-32 border-2 border-border">
                {guild.avatar_url ? (
                  <AvatarImage src={guild.avatar_url} alt={guild.name} />
                ) : (
                  <AvatarFallback className={`${
                    guild.faction === 'horde' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    <Shield className="h-10 w-10 lg:h-12 lg:w-12" strokeWidth={1.5} />
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex flex-wrap justify-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <CosmicButton
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  loading={uploading}
                  icon={<Upload className="h-4 w-4" />}
                >
                  {t.guildSettings.uploadAvatar}
                </CosmicButton>
                {guild.avatar_url && (
                  <CosmicButton
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveAvatar}
                    disabled={removing}
                    loading={removing}
                    icon={<Trash2 className="h-4 w-4" />}
                    className="text-destructive hover:text-destructive"
                  >
                    {t.guildSettings.removeAvatar}
                  </CosmicButton>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                {t.guildSettings.avatarHint}
              </p>
            </div>
          </GlowCard>

          {/* Guild Info Section - spans 2 columns on large screens */}
          <GlowCard className="p-6 lg:col-span-2">
            <h2 className="font-display text-lg mb-4">{t.guildSettings.guildInfo}</h2>
            
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
              <div className="flex justify-between gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">{t.guild.name}</span>
                <span className="font-medium text-right break-words">{guild.name}</span>
              </div>
              <div className="flex justify-between gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">{t.guild.server}</span>
                <span className="font-medium text-right break-words">{guild.server.charAt(0).toUpperCase() + guild.server.slice(1)}</span>
              </div>
              <div className="flex justify-between gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">{t.battlenet.region}</span>
                <span className="font-medium uppercase text-right">{guild.region}</span>
              </div>
              <div className="flex justify-between gap-2 py-2 border-b border-border/50">
                <span className="text-muted-foreground text-sm">{t.guild.faction}</span>
                <span className={`font-medium text-right ${
                  guild.faction === 'horde' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {guild.faction === 'horde' ? t.guild.horde : t.guild.alliance}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{t.guildSettings.syncedFromBnet}</span>
              </div>
              
              <CosmicButton
                size="sm"
                variant="outline"
                onClick={handleResyncBattlenet}
                disabled={syncing}
                loading={syncing}
                icon={syncing ? undefined : <RefreshCw className="h-4 w-4" />}
                className="w-full sm:w-auto"
              >
                <BattleNetIcon className="h-4 w-4 mr-1" />
                {syncing ? t.guildSettings.syncing : t.guildSettings.resyncBattlenet}
              </CosmicButton>
              <p className="text-xs text-muted-foreground">
                {t.guildSettings.resyncDescription}
              </p>
            </div>
          </GlowCard>
        </div>

        {/* Permissions Section - Full width */}
        <div className="mb-6">
          <GlowCard className="p-6">
            <GuildPermissionsEditor guildId={guild.id} />
          </GlowCard>
        </div>

        {/* Roster Manager Section - Full width */}
        <RosterManager
          guildId={guild.id}
          rosters={rosters}
          members={members}
          ranks={ranks}
          onRosterChange={() => loadRostersAndMembers(guild.id)}
          initialRosterId={initialRosterId}
        />
      </main>
    </div>
  );
};

export default GuildSettings;
