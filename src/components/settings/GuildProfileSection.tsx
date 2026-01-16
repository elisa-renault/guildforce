import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Shield, Crown } from 'lucide-react';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

interface GuildData {
  id: string;
  name: string;
  server: string;
  region: string;
  faction: string;
  avatar_url: string | null;
  officer_rank_threshold: number;
}

interface GuildProfileSectionProps {
  guild: GuildData;
  ranks: GuildRank[];
  officerRank: number;
  onOfficerRankChange: (rank: number) => void;
  onGuildUpdate: (guild: GuildData) => void;
}

export const GuildProfileSection = ({
  guild,
  ranks,
  officerRank,
  onOfficerRankChange,
  onGuildUpdate,
}: GuildProfileSectionProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingOfficerRank, setSavingOfficerRank] = useState(false);
  const [localOfficerRank, setLocalOfficerRank] = useState(officerRank);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast({
        title: t.guildSettings.uploadError,
        description: t.guildSettings.avatarHint,
        variant: 'destructive',
      });
      return;
    }

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
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${guild.id}/avatar.${ext}`;

      if (guild.avatar_url) {
        const oldPath = guild.avatar_url.split('/guild-avatars/')[1]?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('guild-avatars').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('guild-avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('guild-avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('guilds')
        .update({ avatar_url: avatarUrl })
        .eq('id', guild.id);

      if (updateError) throw updateError;

      onGuildUpdate({ ...guild, avatar_url: avatarUrl });
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
    if (!guild.avatar_url) return;

    setRemoving(true);

    try {
      const oldPath = guild.avatar_url.split('/guild-avatars/')[1]?.split('?')[0];
      if (oldPath) {
        await supabase.storage.from('guild-avatars').remove([oldPath]);
      }

      const { error: updateError } = await supabase
        .from('guilds')
        .update({ avatar_url: null })
        .eq('id', guild.id);

      if (updateError) throw updateError;

      onGuildUpdate({ ...guild, avatar_url: null });
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

  const handleOfficerRankCommit = async (newRank: number) => {
    setSavingOfficerRank(true);
    
    try {
      const { error } = await supabase
        .from('guilds')
        .update({ officer_rank_threshold: newRank })
        .eq('id', guild.id);
      
      if (error) throw error;
      
      onOfficerRankChange(newRank);
      onGuildUpdate({ ...guild, officer_rank_threshold: newRank });
      toast({ title: language === 'fr' ? 'Rang officier mis à jour' : 'Officer rank updated' });
    } catch (error: any) {
      console.error('Error updating officer rank:', error);
      toast({
        title: language === 'fr' ? 'Erreur lors de la mise à jour' : 'Update failed',
        variant: 'destructive',
      });
      setLocalOfficerRank(officerRank);
    } finally {
      setSavingOfficerRank(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar + Info Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
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

        {/* Guild Info Section */}
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

          {/* Officer Rank Threshold */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-amber-400" />
              <Label className="text-sm font-medium">
                {language === 'fr' ? 'Rang officier minimum' : 'Minimum officer rank'}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {language === 'fr' 
                ? 'Les rangs 0 à ce rang seront considérés comme officiers et affichés avec le badge officier. Ce paramètre est propre à Guildforce.'
                : 'Ranks 0 to this rank will be considered officers and displayed with the officer badge. This setting is specific to Guildforce.'}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Slider
                  value={[localOfficerRank]}
                  onValueChange={(value) => setLocalOfficerRank(value[0])}
                  onValueCommit={(value) => handleOfficerRankCommit(value[0])}
                  min={0}
                  max={9}
                  step={1}
                  disabled={savingOfficerRank}
                  className="flex-1"
                />
                <div className="w-16 text-right">
                  <span className="text-sm font-medium">
                    0 → {localOfficerRank}
                  </span>
                </div>
              </div>
              
              {ranks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ranks.filter(r => r.rank_index <= localOfficerRank).map(rank => (
                    <span 
                      key={rank.rank_index}
                      className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary border border-primary/30"
                    >
                      {rank.rank_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
};
