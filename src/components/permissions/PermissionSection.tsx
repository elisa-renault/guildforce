import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Users, Crown, ChevronDown, ChevronUp, ShieldAlert, AlertTriangle } from 'lucide-react';
import { PermissionType, PermissionRule, GuildMember, GuildRank } from '@/hooks/useGuildPermissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface PermissionSectionProps {
  permissionType: PermissionType;
  label: string;
  description: string;
  rules: PermissionRule[];
  members: GuildMember[];
  ranks: GuildRank[];
  officerRankThreshold: number;
  onChange: (rules: Omit<PermissionRule, 'permission_type'>[]) => void;
  isSensitive?: boolean;
}

interface RankSliderProps {
  maxValue: number;
  maxRank: number;
  ranks: GuildRank[];
  officerRankThreshold: number;
  onChange: (max: number) => void;
}

const RankSlider = ({ maxValue, maxRank, ranks, officerRankThreshold, onChange }: RankSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const { t } = useLanguage();
  const isFrench = t.common.loading === 'Chargement...';
  
  const minRank = 0;
  const allRankIndices: number[] = [];
  for (let i = minRank; i <= maxRank; i++) {
    allRankIndices.push(i);
  }

  const getRankName = (index: number) => {
    // If this rank is within officer threshold, show "Officiers" instead
    if (index <= officerRankThreshold && index > 0) {
      return isFrench ? 'Officiers' : 'Officers';
    }
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

// Helper to generate summary badge text
const getSummaryBadge = (rules: PermissionRule[], maxRankIndex: number, members: GuildMember[], ranks: GuildRank[], officerRankThreshold: number, isFrench: boolean): { text: string; variant: 'default' | 'secondary' | 'outline' } => {
  if (rules.length === 0) {
    return { text: isFrench ? 'GM seul' : 'GM only', variant: 'outline' };
  }

  const rankRule = rules.find(r => r.access_type === 'rank');
  const userRules = rules.filter(r => r.access_type === 'user');

  // Check if all members have access
  if (rankRule && rankRule.max_rank_index === maxRankIndex) {
    return { text: isFrench ? 'Tous les membres' : 'All members', variant: 'default' };
  }

  const parts: string[] = [];

  if (rankRule) {
    const maxIdx = rankRule.max_rank_index ?? 0;
    // If the max rank is within officer threshold, show "Officers"
    if (maxIdx <= officerRankThreshold && maxIdx > 0) {
      parts.push(isFrench ? 'Officiers' : 'Officers');
    } else if (maxIdx === 0) {
      parts.push(isFrench ? 'Rang 0' : 'Rank 0');
    } else {
      parts.push(isFrench ? `Rangs 0-${maxIdx}` : `Ranks 0-${maxIdx}`);
    }
  }

  if (userRules.length > 0) {
    if (userRules.length === 1) {
      const user = members.find(m => m.user_id === userRules[0].user_id);
      parts.push(user?.username || (isFrench ? '1 utilisateur' : '1 user'));
    } else {
      parts.push(isFrench ? `${userRules.length} utilisateurs` : `${userRules.length} users`);
    }
  }

  return { text: parts.join(' + '), variant: 'secondary' };
};

export const PermissionSection = ({ 
  permissionType, 
  label, 
  description, 
  rules, 
  members, 
  ranks, 
  officerRankThreshold,
  onChange,
  isSensitive = false,
}: PermissionSectionProps) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(rules.length > 0);
  const isFrench = t.common.loading === 'Chargement...';
  
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const maxRankIndex = sortedRanks.length > 0 ? Math.max(...sortedRanks.map(r => r.rank_index)) : 9;

  const rankRule = rules.find(r => r.access_type === 'rank');
  const hasRankRule = !!rankRule;
  const isAllMembers = rankRule && rankRule.max_rank_index === maxRankIndex;

  const handleAllMembersToggle = (checked: boolean) => {
    if (checked) {
      // Add a rank rule for all members (0 to maxRankIndex)
      const userRules = rules.filter(r => r.access_type === 'user');
      onChange([{ access_type: 'rank', min_rank_index: 0, max_rank_index: maxRankIndex }, ...userRules]);
    } else {
      // Remove the rank rule
      onChange(rules.filter(r => r.access_type !== 'rank'));
    }
  };

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

  const summaryBadge = getSummaryBadge(rules, maxRankIndex, members, sortedRanks, officerRankThreshold, isFrench);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={`border rounded-md overflow-hidden ${
        isSensitive ? 'border-orange-500/30 bg-orange-500/5' : 'border-border/50'
      }`}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors text-left gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs truncate">{label}</span>
                {isSensitive && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <ShieldAlert className="h-3 w-3 text-orange-500 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs max-w-[200px]">
                          {isFrench 
                            ? 'Permission sensible - accordez-la avec précaution'
                            : 'Sensitive permission - grant carefully'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                summaryBadge.variant === 'default' 
                  ? 'bg-primary/20 text-primary' 
                  : summaryBadge.variant === 'secondary'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {summaryBadge.text}
              </span>
              {isOpen ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-2 space-y-2 border-t border-border/50 pt-2">
            {/* All members checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`${permissionType}-all`}
                checked={isAllMembers}
                onCheckedChange={handleAllMembersToggle}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor={`${permissionType}-all`}
                className="text-xs cursor-pointer select-none flex-1"
              >
                {isFrench ? 'Tous les membres' : 'All members'}
              </label>
              {isAllMembers && isSensitive && (
                <Badge variant="outline" className="text-orange-500 border-orange-500/50 text-[9px] px-1 py-0">
                  <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                  {isFrench ? 'Risqué' : 'Risky'}
                </Badge>
              )}
            </div>

            {!isAllMembers && (
              <>
                {rules.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    {isFrench ? 'GM uniquement' : 'GM only'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded border border-border/30 bg-muted/10">
                        {rule.access_type === 'rank' ? (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                              <Crown className="h-2.5 w-2.5 text-primary" />
                              <span>{isFrench ? 'Rangs 0' : 'Ranks 0'} → {rule.max_rank_index ?? 0}</span>
                            </div>
                            <RankSlider
                              maxValue={rule.max_rank_index ?? 0}
                              maxRank={maxRankIndex}
                              ranks={sortedRanks}
                              officerRankThreshold={officerRankThreshold}
                              onChange={(max) => updateRule(index, { min_rank_index: 0, max_rank_index: max })}
                            />
                          </div>
                        ) : (
                          <div className="flex-1 min-w-0">
                            <Select
                              value={rule.user_id || ''}
                              onValueChange={(value) => updateRule(index, { user_id: value })}
                            >
                              <SelectTrigger className="w-full bg-card border-border h-7 text-xs">
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
                          className="w-6 h-6 rounded bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  {!hasRankRule && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRankRule}
                      className="text-[10px] h-6 px-2"
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" />
                      {isFrench ? 'Rang' : 'Rank'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addUserRule}
                    disabled={members.length === 0}
                    className="text-[10px] h-6 px-2"
                  >
                    <Plus className="h-2.5 w-2.5 mr-0.5" />
                    {isFrench ? 'Utilisateur' : 'User'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
