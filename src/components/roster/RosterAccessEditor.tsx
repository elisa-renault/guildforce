import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users, Crown } from 'lucide-react';

interface AccessRule {
  access_type: 'user' | 'rank';
  user_id?: string;
  min_rank_index?: number;
  max_rank_index?: number;
}

interface GuildMember {
  user_id: string;
  username: string;
}

interface GuildRank {
  rank_index: number;
  rank_name: string;
}

interface RosterAccessEditorProps {
  accessRules: AccessRule[];
  members: GuildMember[];
  ranks: GuildRank[];
  onChange: (rules: AccessRule[]) => void;
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
  
  // Always start from 0 (GM)
  const allRankIndices = Array.from({ length: maxRank + 1 }, (_, i) => i);

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
    
    // Minimum is 0 (GM always selected)
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
    // Clicking on a tick sets the max to that index (min is always 0)
    onChange(index);
  };

  // Calculate positions for track to align with first and last tick centers
  const trackLeftOffset = 10; // half of tick width (20px)
  const trackRightOffset = 10;

  return (
      <div className="py-4 select-none overflow-hidden">
        {/* Track container */}
        <div className="relative h-8 flex items-center overflow-hidden">
        {/* Background track - starts and ends at tick centers */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-border rounded-full"
          style={{ 
            left: `${trackLeftOffset}px`,
            right: `${trackRightOffset}px`
          }}
        />
        
        {/* Filled track */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full pointer-events-none"
          style={{ 
            left: `${trackLeftOffset}px`,
            width: maxRank > 0 ? `calc((100% - ${trackLeftOffset + trackRightOffset}px) * ${maxValue / maxRank})` : '0px'
          }}
        />
        
        {/* Tick marks container */}
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
                {/* Tick mark */}
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
      
      {/* Labels row */}
      <div className="flex justify-between mt-2">
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
      
      {/* Range description */}
      <div className="text-xs text-muted-foreground mt-3 text-center">
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

export const RosterAccessEditor = ({ accessRules, members, ranks, onChange }: RosterAccessEditorProps) => {
  const { t } = useLanguage();
  
  // Sort ranks by index
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const maxRankIndex = sortedRanks.length > 0 ? Math.max(...sortedRanks.map(r => r.rank_index)) : 9;

  const addRankRule = () => {
    // Start with just GM selected
    onChange([...accessRules, { access_type: 'rank', min_rank_index: 0, max_rank_index: 0 }]);
  };

  const addUserRule = () => {
    onChange([...accessRules, { access_type: 'user', user_id: members[0]?.user_id }]);
  };

  const removeRule = (index: number) => {
    onChange(accessRules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<AccessRule>) => {
    const updated = [...accessRules];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const selectedUserIds = accessRules
    .filter(r => r.access_type === 'user')
    .map(r => r.user_id)
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <label className="text-sm text-muted-foreground flex items-center gap-2">
        <Users className="h-4 w-4" />
        {t.rosters?.accessRules || 'Who can submit wishes'}
      </label>

      <div className="space-y-3">
        {accessRules.map((rule, index) => (
          <div key={index} className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
            {rule.access_type === 'rank' ? (
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-primary" />
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
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{t.rosters?.byUser || 'Specific User'}</span>
                </div>
                <Select
                  value={rule.user_id || ''}
                  onValueChange={(value) => updateRule(index, { user_id: value })}
                >
                  <SelectTrigger className="w-full bg-card border-border">
                    <SelectValue placeholder={t.rosters?.selectUser || 'Select user'} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {members
                      .filter(m => !selectedUserIds.includes(m.user_id) || m.user_id === rule.user_id)
                      .map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id} className="hover:bg-primary/20">
                          {member.username}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Only show delete button for user rules, not rank rules */}
            {rule.access_type === 'user' && (
              <button
                onClick={() => removeRule(index)}
                className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0 mt-1"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addUserRule}
          disabled={members.length === 0}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {t.rosters?.addUserRule || 'Add User'}
        </Button>
      </div>

      {accessRules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t.rosters?.noAccessWarning || 'No access rules defined. Only GMs will be able to submit wishes.'}
        </p>
      )}
    </div>
  );
};