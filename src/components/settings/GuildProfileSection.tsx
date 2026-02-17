import { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Shield, Crown } from 'lucide-react';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatRankLabel } from '@/lib/rankLabel';

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

// Custom slider component matching permissions style
interface OfficerRankSliderProps {
  maxValue: number;
  maxRank: number;
  ranks: GuildRank[];
  onChange: (max: number) => void;
  onCommit: (max: number) => void;
  disabled?: boolean;
}

const OfficerRankSlider = ({ maxValue, maxRank, ranks, onChange, onCommit, disabled }: OfficerRankSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(maxValue);
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const { t } = useLanguage();
  const rankLabel = resolveSemanticMessage({ key: 'guild.members.rank_label', language: t.lang, translations: t });
  
  const allRankIndices = Array.from({ length: maxRank + 1 }, (_, i) => i);

  const getRankName = (index: number) => {
    const rank = sortedRanks.find(r => r.rank_index === index);
    return formatRankLabel({
      rankName: rank?.rank_name,
      rankIndex: index,
      rankLabel,
      guildMasterLabel: t.guild.rank0,
    });
  };

  const getIndexFromPosition = useCallback((clientX: number): number => {
    if (!containerRef.current) return localValue;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    const index = Math.round(percentage * maxRank);
    
    return Math.max(0, Math.min(maxRank, index));
  }, [maxRank, localValue]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const newIndex = getIndexFromPosition(e.clientX);
    setLocalValue(newIndex);
    onChange(newIndex);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || disabled) return;
    const newIndex = getIndexFromPosition(e.clientX);
    setLocalValue(newIndex);
    onChange(newIndex);
  }, [isDragging, getIndexFromPosition, onChange, disabled]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && !disabled) {
      onCommit(localValue);
    }
    setIsDragging(false);
  }, [isDragging, localValue, onCommit, disabled]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const newIndex = getIndexFromPosition(touch.clientX);
    setLocalValue(newIndex);
    onChange(newIndex);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || disabled) return;
    const touch = e.touches[0];
    const newIndex = getIndexFromPosition(touch.clientX);
    setLocalValue(newIndex);
    onChange(newIndex);
  }, [isDragging, getIndexFromPosition, onChange, disabled]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(maxValue);
    }
  }, [maxValue, isDragging]);

  const handleTickClick = (index: number) => {
    if (disabled) return;
    setLocalValue(index);
    onChange(index);
    onCommit(index);
  };

  const trackLeftOffset = 10;
  const trackRightOffset = 10;

  return (
    <div className="py-3 select-none">
      <div className="relative h-8 flex items-center">
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-border rounded-full"
          style={{ 
            left: `${trackLeftOffset}px`,
            right: `${trackRightOffset}px`
          }}
        />
        
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full pointer-events-none"
          style={{ 
            left: `${trackLeftOffset}px`,
            width: maxRank > 0 ? `calc((100% - ${trackLeftOffset + trackRightOffset}px) * ${localValue / maxRank})` : '0px'
          }}
        />
        
        <div 
          ref={containerRef}
          className={`absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {allRankIndices.map((index) => {
            const isSelected = index <= localValue;
            const isEndpoint = index === localValue;
            
            return (
              <div 
                key={index} 
                className="relative flex items-center justify-center"
                style={{ width: '20px' }}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); handleTickClick(index); }}
                  className={`transition-colors z-10 ${
                    isEndpoint 
                      ? `w-5 h-5 rounded-full bg-primary shadow-lg shadow-primary/40 ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}` 
                      : isSelected
                        ? `w-2.5 h-2.5 rounded-full bg-primary ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`
                        : `w-2.5 h-2.5 rounded-full bg-muted-foreground/40 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-muted-foreground/60'}`
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-between mt-1">
        {allRankIndices.map((index) => {
          const isSelected = index <= localValue;
          return (
            <div 
              key={index} 
              className="flex justify-center"
              style={{ width: '20px' }}
            >
              <span 
                className={`text-[10px] tabular-nums ${
                  isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {index}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="text-xs text-muted-foreground mt-2 text-center">
        <span className="text-primary font-medium">{getRankName(0)}</span>
        {localValue > 0 && (
          <>
            <span className="mx-1">→</span>
            <span className="text-primary font-medium">{getRankName(localValue)}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const GuildProfileSection = ({
  guild,
  ranks,
  officerRank,
  onOfficerRankChange,
  onGuildUpdate,
}: GuildProfileSectionProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : t.errors.generic;
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
    } catch (error: unknown) {
      toast({
        title: t.guildSettings.uploadError,
        description: getErrorMessage(error),
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
    } catch (error: unknown) {
      toast({
        title: t.errors.generic,
        description: getErrorMessage(error),
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
      toast({ title: t.guildSettings.officerRankUpdated });
    } catch (error: unknown) {
      toast({
        title: t.errors.generic,
        description: getErrorMessage(error),
        variant: 'destructive',
      });
      setLocalOfficerRank(officerRank);
    } finally {
      setSavingOfficerRank(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Avatar + Info Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Avatar Section */}
        <GlowCard className="p-4 md:p-6 overflow-hidden">
          <h2 className="font-display text-base md:text-lg mb-3 md:mb-4">{t.guildSettings.avatar}</h2>
          
          <div className="flex flex-col items-center gap-3 md:gap-4">
            <Avatar className="h-24 w-24 md:h-28 md:w-28 lg:h-32 lg:w-32 border-2 border-border">
              {guild.avatar_url ? (
                <AvatarImage src={guild.avatar_url} alt={guild.name} />
              ) : (
                <AvatarFallback className={`${
                  guild.faction === 'horde' 
                    ? 'bg-horde/20 text-horde' 
                    : 'bg-alliance/20 text-alliance'
                }`}>
                  <Shield className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12" strokeWidth={1.5} />
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
        <GlowCard className="p-4 md:p-6 lg:col-span-2">
          <h2 className="font-display text-base md:text-lg mb-3 md:mb-4">{t.guildSettings.guildInfo}</h2>
          
          <div className="grid gap-y-0.5 sm:grid-cols-2 sm:gap-x-8">
            <div className="flex justify-between gap-2 py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">{t.guild.name}</span>
              <span className="font-medium text-right break-words">{guild.name}</span>
            </div>
            <div className="flex justify-between gap-2 py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">{t.battlenet.region}</span>
              <span className="font-medium uppercase text-right">{guild.region}</span>
            </div>
            <div className="flex justify-between gap-2 py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">{t.guild.faction}</span>
              <span className={`font-medium text-right ${
                guild.faction === 'horde' ? 'text-horde' : 'text-alliance'
              }`}>
                {guild.faction === 'horde' ? t.guild.horde : t.guild.alliance}
              </span>
            </div>
            <div className="flex justify-between gap-2 py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">{t.guild.server}</span>
              <span className="font-medium text-right break-words">{guild.server.charAt(0).toUpperCase() + guild.server.slice(1)}</span>
            </div>
          </div>

          {/* Officer Rank Threshold */}
          <div className="mt-4 md:mt-6">
            <div className="flex items-center gap-2 mb-1.5 md:mb-2">
              <Crown className="h-4 w-4 text-warning" />
              <Label className="text-xs md:text-sm font-medium">
                {t.permissions.officers}
              </Label>
              <span className="text-xs md:text-sm font-medium text-muted-foreground ml-auto">
                0 → {localOfficerRank}
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mb-2 md:mb-3">
              {interpolateMessage(t.permissions.ranksRange, { max: localOfficerRank })}
            </p>
            
            <OfficerRankSlider
              maxValue={localOfficerRank}
              maxRank={9}
              ranks={ranks}
              onChange={setLocalOfficerRank}
              onCommit={handleOfficerRankCommit}
              disabled={savingOfficerRank}
            />
            
            {ranks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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
        </GlowCard>
      </div>
    </div>
  );
};

