import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { PermissionType, PermissionRule, GuildMember, GuildRank } from '@/hooks/useGuildPermissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PermissionSectionProps {
  permissionType: PermissionType;
  label: string;
  description: string;
  rules: PermissionRule[];
  members: GuildMember[];
  ranks: GuildRank[];
  onChange: (rules: Omit<PermissionRule, 'permission_type'>[]) => void;
}

interface RankSliderProps {
  maxValue: number;
  maxRank: number;
  ranks: GuildRank[];
  onChange: (max: number) => void;
}

const RankSlider = ({ maxValue, maxRank, ranks, onChange }: RankSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  
  const minRank = 0;
  const allRankIndices: number[] = [];
  for (let i = minRank; i <= maxRank; i++) {
    allRankIndices.push(i);
  }

  const getRankName = (index: number) => {
    const rank = sortedRanks.find(r => r.rank_index === index);
    return rank?.rank_name || `Rank ${index}`;
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
            width: maxRank > 0 ? `calc((100% - ${trackLeftOffset + trackRightOffset}px) * ${maxValue / maxRank})` : '0px'
          }}
        />
        
        <div 
          ref={containerRef}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between cursor-pointer"
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
                style={{ width: '20px' }}
              >
                <div
                  onClick={(e) => { e.stopPropagation(); handleTickClick(index); }}
                  className={`transition-colors z-10 ${
                    isEndpoint 
                      ? 'w-5 h-5 rounded-full bg-primary cursor-grab active:cursor-grabbing shadow-lg shadow-primary/40' 
                      : isSelected
                        ? 'w-2.5 h-2.5 rounded-full bg-primary cursor-pointer'
                        : 'w-2.5 h-2.5 rounded-full bg-muted-foreground/40 cursor-pointer hover:bg-muted-foreground/60'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-between mt-1">
        {allRankIndices.map((index) => {
          const isSelected = index <= maxValue;
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

export const PermissionSection = ({ 
  permissionType, 
  label, 
  description, 
  rules, 
  members, 
  ranks, 
  onChange 
}: PermissionSectionProps) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(rules.length > 0);
  
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const maxRankIndex = sortedRanks.length > 0 ? Math.max(...sortedRanks.map(r => r.rank_index)) : 9;

  const addRankRule = () => {
    onChange([...rules, { access_type: 'rank', min_rank_index: 0, max_rank_index: 0 }]);
    setIsOpen(true);
  };

  const addUserRule = () => {
    if (members.length > 0) {
      onChange([...rules, { access_type: 'user', user_id: members[0]?.user_id }]);
      setIsOpen(true);
    }
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<PermissionRule>) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const selectedUserIds = rules
    .filter(r => r.access_type === 'user')
    .map(r => r.user_id)
    .filter(Boolean);

  const hasRankRule = rules.some(r => r.access_type === 'rank');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left">
            <div className="flex-1">
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
            </div>
            <div className="flex items-center gap-2">
              {rules.length > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  {rules.length} {rules.length === 1 ? 'règle' : 'règles'}
                </span>
              )}
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                {(t as any).permissions?.noRules || 'Only GMs have this permission'}
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 rounded-lg border border-border/30 bg-muted/10">
                    {rule.access_type === 'rank' ? (
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Crown className="h-3 w-3 text-primary" />
                          <span>{t.rosters?.byRank || 'By Rank'}</span>
                        </div>
                        <RankSlider
                          maxValue={rule.max_rank_index ?? 0}
                          maxRank={maxRankIndex}
                          ranks={sortedRanks}
                          onChange={(max) => updateRule(index, { min_rank_index: 0, max_rank_index: max })}
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <Users className="h-3 w-3 text-primary" />
                          <span>{t.rosters?.byUser || 'Specific User'}</span>
                        </div>
                        <Select
                          value={rule.user_id || ''}
                          onValueChange={(value) => updateRule(index, { user_id: value })}
                        >
                          <SelectTrigger className="w-full bg-card border-border h-8 text-xs">
                            <SelectValue placeholder={t.rosters?.selectUser || 'Select user'} />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {members
                              .filter(m => !selectedUserIds.includes(m.user_id) || m.user_id === rule.user_id)
                              .map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id} className="hover:bg-primary/20 text-xs">
                                  {member.username}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <button
                      onClick={() => removeRule(index)}
                      className="w-7 h-7 rounded-md bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {!hasRankRule && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRankRule}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {(t as any).permissions?.addRankRule || 'Add by rank'}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addUserRule}
                disabled={members.length === 0}
                className="text-xs h-7"
              >
                <Plus className="h-3 w-3 mr-1" />
                {(t as any).permissions?.addUserRule || 'Add user'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
