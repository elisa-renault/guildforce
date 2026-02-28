import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ChevronDown, Crown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PermissionRule, GuildRank } from '@/hooks/useGuildPermissions';
import { useState, useRef, useEffect, useCallback } from 'react';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatRankLabel } from '@/lib/rankLabel';

interface PermissionRowProps {
  label: string;
  description: string;
  rules: PermissionRule[];
  ranks: GuildRank[];
  officerRankThreshold: number;
  maxRankIndex: number;
  onChange: (rules: Omit<PermissionRule, 'permission_type'>[]) => void;
  isSensitive?: boolean;
}

type AccessLevel = 'gm_only' | 'officers' | 'all' | 'custom';

// Mini RankSlider for custom selection
const MiniRankSlider = ({ 
  maxValue, 
  maxRank, 
  ranks, 
  onChange 
}: { 
  maxValue: number; 
  maxRank: number; 
  ranks: GuildRank[];
  onChange: (max: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
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
    if (!containerRef.current) return maxValue;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    const index = Math.round(percentage * maxRank);
    
    return Math.max(0, Math.min(maxRank, index));
  }, [maxRank, maxValue]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newIndex = getIndexFromPosition(e.clientX);
    onChange(newIndex);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newIndex = getIndexFromPosition(e.clientX);
    onChange(newIndex);
  }, [isDragging, getIndexFromPosition, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const newIndex = getIndexFromPosition(touch.clientX);
    onChange(newIndex);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newIndex = getIndexFromPosition(touch.clientX);
    onChange(newIndex);
  }, [isDragging, getIndexFromPosition, onChange]);

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

  const handleTickClick = (index: number) => {
    onChange(index);
  };

  return (
    <div className="py-2 select-none w-full">
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-1 bg-border rounded-full" />
        
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full pointer-events-none"
          style={{ 
            left: '8px',
            width: maxRank > 0 ? `calc((100% - 16px) * ${maxValue / maxRank})` : '0px'
          }}
        />
        
        <div 
          ref={containerRef}
          className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between cursor-pointer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {allRankIndices.map((index) => {
            const isSelected = index <= maxValue;
            const isEndpoint = index === maxValue;
            
            return (
              <div 
                key={index} 
                className="relative flex items-center justify-center"
                style={{ width: '16px' }}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); handleTickClick(index); }}
                  className={`transition-colors z-10 ${
                    isEndpoint 
                      ? 'w-4 h-4 rounded-full bg-primary cursor-grab active:cursor-grabbing shadow-lg shadow-primary/40' 
                      : isSelected
                        ? 'w-2 h-2 rounded-full bg-primary cursor-pointer'
                        : 'w-2 h-2 rounded-full bg-muted-foreground/40 cursor-pointer hover:bg-muted-foreground/60'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-between mt-0.5 px-2">
        {allRankIndices.map((index) => {
          const isSelected = index <= maxValue;
          return (
            <div 
              key={index} 
              className="flex justify-center"
              style={{ width: '16px' }}
            >
              <span 
                className={`text-[9px] tabular-nums ${
                  isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {index}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="text-[10px] text-muted-foreground mt-1 text-center">
        <span className="text-primary font-medium">{getRankName(0)}</span>
        {maxValue > 0 && (
          <>
            <span className="mx-1">→</span>
            <span className="text-primary font-medium">{getRankName(maxValue)}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const PermissionRow = ({
  label,
  description,
  rules,
  ranks,
  officerRankThreshold,
  maxRankIndex,
  onChange,
  isSensitive = false,
}: PermissionRowProps) => {
  const { t } = useLanguage();
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  
  // Get rank rules (ignoring user rules for the dropdown)
  const rankRule = rules.find(r => r.access_type === 'rank');
  const userRules = rules.filter(r => r.access_type === 'user');
  
  // Determine current access level
  const getCurrentLevel = (): AccessLevel => {
    if (!rankRule) return 'gm_only';
    if (rankRule.max_rank_index === maxRankIndex) return 'all';
    if (rankRule.max_rank_index === officerRankThreshold) return 'officers';
    return 'custom';
  };
  
  const currentLevel = getCurrentLevel();
  const customRankValue = rankRule?.max_rank_index ?? 0;

  const getDisplayRankName = (index: number) => {
    const rank = ranks.find((entry) => entry.rank_index === index);
    if (rank?.rank_name) return rank.rank_name;
    return index === 0 ? t.guild.rank0 : `${index}`;
  };
  
  const handleLevelChange = (level: AccessLevel) => {
    if (level === 'gm_only') {
      // Keep only user rules
      onChange(userRules);
    } else if (level === 'officers') {
      onChange([{ access_type: 'rank', min_rank_index: 0, max_rank_index: officerRankThreshold }, ...userRules]);
    } else if (level === 'all') {
      onChange([{ access_type: 'rank', min_rank_index: 0, max_rank_index: maxRankIndex }, ...userRules]);
    } else if (level === 'custom') {
      // Create a rank rule with default value (1 to start customizing) and open popover
      onChange([{ access_type: 'rank', min_rank_index: 0, max_rank_index: 1 }, ...userRules]);
      // Use setTimeout to ensure state updates before opening popover
      setTimeout(() => setCustomPopoverOpen(true), 50);
    }
  };
  
  const handleCustomRankChange = (maxRank: number) => {
    onChange([{ access_type: 'rank', min_rank_index: 0, max_rank_index: maxRank }, ...userRules]);
  };
  
  const getLevelLabel = (level: AccessLevel): string => {
    switch (level) {
      case 'gm_only': return t.permissions.gmOnly;
      case 'officers': return t.permissions.officers;
      case 'all': return t.permissions.allMembers;
      case 'custom': return `${getDisplayRankName(0)} → ${getDisplayRankName(customRankValue)}`;
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 border-b border-border/30 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{label}</span>
            {isSensitive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ShieldAlert className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs max-w-[200px]">
                      {t.permissions.sensitivePermission}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* User count badge if there are individual users */}
        {userRules.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary whitespace-nowrap">
            +{userRules.length}
          </span>
        )}
        
        {currentLevel === 'custom' ? (
          <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 min-w-[140px] justify-between text-xs gap-1"
              >
                <div className="flex items-center gap-1">
                  <Crown className="h-3 w-3 text-primary" />
                  <span>{getLevelLabel('custom')}</span>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <div className="text-xs font-medium">{t.permissions.maxRank}</div>
                <MiniRankSlider 
                  maxValue={customRankValue}
                  maxRank={maxRankIndex}
                  ranks={ranks}
                  onChange={handleCustomRankChange}
                />
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs h-7"
                    onClick={() => { handleLevelChange('gm_only'); setCustomPopoverOpen(false); }}
                  >
                    {t.permissions.gmOnly}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs h-7"
                    onClick={() => { handleLevelChange('officers'); setCustomPopoverOpen(false); }}
                  >
                    {t.permissions.officers}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Select 
            value={currentLevel} 
            onValueChange={(val) => handleLevelChange(val as AccessLevel)}
          >
            <SelectTrigger className="h-8 min-w-[140px] text-xs bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="gm_only" className="text-xs">
                {t.permissions.gmOnly}
              </SelectItem>
              <SelectItem value="officers" className="text-xs">
                {t.permissions.officers}
              </SelectItem>
              <SelectItem value="all" className="text-xs">
                {t.permissions.allMembers}
              </SelectItem>
              <SelectItem value="custom" className="text-xs">
                {t.permissions.custom}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};

