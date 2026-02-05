import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Users, Crown, Eye } from 'lucide-react';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';

export interface ResultsAccessRule {
  access_type: 'rank_range' | 'user';
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

interface PollResultsAccessEditorProps {
  accessRules: ResultsAccessRule[];
  members: GuildMember[];
  ranks: GuildRank[];
  officerRankThreshold?: number;
  onChange: (rules: ResultsAccessRule[]) => void;
  restrictAccess: boolean;
  onRestrictAccessChange: (restricted: boolean) => void;
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
  const { language, t } = useLanguage();
  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);

  const allRankIndices = Array.from({ length: maxRank + 1 }, (_, i) => i);

  const getRankName = (index: number) => {
    const rank = sortedRanks.find((r) => r.rank_index === index);
    return rank?.rank_name || `Rank ${index}`;
  };

  const getDisplayName = (index: number) => {
    if (index === officerRankThreshold) {
      return s('polls.results_access.officer_threshold');
    }
    return getRankName(index);
  };

  const getIndexFromPosition = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return maxValue;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
      const index = Math.round(percentage * maxRank);

      return Math.max(0, Math.min(maxRank, index));
    },
    [maxRank, maxValue],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newIndex = getIndexFromPosition(e.clientX);
    onChange(newIndex);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newIndex = getIndexFromPosition(e.clientX);
      onChange(newIndex);
    },
    [isDragging, getIndexFromPosition, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const newIndex = getIndexFromPosition(touch.clientX);
    onChange(newIndex);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const newIndex = getIndexFromPosition(touch.clientX);
      onChange(newIndex);
    },
    [isDragging, getIndexFromPosition, onChange],
  );

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
    <div className="py-4 select-none">
      <div className="relative h-8 flex items-center">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-border rounded-full"
          style={{
            left: `${trackLeftOffset}px`,
            right: `${trackRightOffset}px`,
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full pointer-events-none"
          style={{
            left: `${trackLeftOffset}px`,
            width: maxRank > 0 ? `calc((100% - ${trackLeftOffset + trackRightOffset}px) * ${maxValue / maxRank})` : '0px',
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
              <div key={index} className="relative flex items-center justify-center" style={{ width: '20px' }}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTickClick(index);
                  }}
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

      <div className="flex justify-between mt-2">
        {allRankIndices.map((index) => {
          const isSelected = index <= maxValue;
          return (
            <div key={index} className="flex justify-center" style={{ width: '20px' }}>
              <span className={`text-[10px] tabular-nums ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {index}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground mt-3 text-center">
        <span className="text-primary font-medium">{getRankName(0)}</span>
        {maxValue > 0 && (
          <>
            <span className="mx-1">{'->'}</span>
            <span className="text-primary font-medium">{getDisplayName(maxValue)}</span>
          </>
        )}
      </div>
    </div>
  );
};

export const PollResultsAccessEditor = ({
  accessRules,
  members,
  ranks,
  officerRankThreshold = 2,
  onChange,
  restrictAccess,
  onRestrictAccessChange,
}: PollResultsAccessEditorProps) => {
  const { language, t } = useLanguage();
  const s = (key: SemanticKey) => resolveSemanticMessage({ key, language, translations: t });

  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const maxRankIndex = sortedRanks.length > 0 ? Math.max(...sortedRanks.map((r) => r.rank_index)) : 9;

  const handleRestrictChange = (checked: boolean) => {
    onRestrictAccessChange(checked);
    if (checked && accessRules.length === 0) {
      onChange([{ access_type: 'rank_range', min_rank_index: 0, max_rank_index: 0 }]);
    }
  };

  const addUserRule = () => {
    if (members.length > 0) {
      onChange([...accessRules, { access_type: 'user', user_id: members[0]?.user_id }]);
    }
  };

  const removeRule = (index: number) => {
    onChange(accessRules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<ResultsAccessRule>) => {
    const updated = [...accessRules];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const selectedUserIds = accessRules
    .filter((r) => r.access_type === 'user')
    .map((r) => r.user_id)
    .filter(Boolean);

  const rankRule = accessRules.find((r) => r.access_type === 'rank_range');
  const rankRuleIndex = accessRules.findIndex((r) => r.access_type === 'rank_range');

  const handleRankChange = (maxRank: number) => {
    if (rankRuleIndex >= 0) {
      updateRule(rankRuleIndex, { min_rank_index: 0, max_rank_index: maxRank });
    } else {
      onChange([...accessRules, { access_type: 'rank_range', min_rank_index: 0, max_rank_index: maxRank }]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">{s('polls.results_access.title')}</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="restrict-results" checked={restrictAccess} onCheckedChange={handleRestrictChange} />
        <Label htmlFor="restrict-results" className="cursor-pointer text-sm">
          {s('polls.results_access.restrict_toggle')}
        </Label>
      </div>

      {!restrictAccess && <p className="text-xs text-muted-foreground">{s('polls.results_access.open_hint')}</p>}

      {restrictAccess && (
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Crown className="h-4 w-4 text-primary" />
              <span>{s('polls.results_access.rank_rule_title')}</span>
            </div>
            <RankSlider
              maxValue={rankRule?.max_rank_index ?? 0}
              maxRank={maxRankIndex}
              ranks={sortedRanks}
              officerRankThreshold={officerRankThreshold}
              onChange={handleRankChange}
            />
          </div>

          {accessRules
            .filter((r) => r.access_type === 'user')
            .map((rule) => {
              const actualIndex = accessRules.indexOf(rule);
              return (
                <div key={actualIndex} className="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span>{s('polls.results_access.user_rule_title')}</span>
                    </div>
                    <Select value={rule.user_id || ''} onValueChange={(value) => updateRule(actualIndex, { user_id: value })}>
                      <SelectTrigger className="w-full bg-card border-border">
                        <SelectValue placeholder={s('polls.results_access.user_placeholder')} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {members
                          .filter((m) => !selectedUserIds.includes(m.user_id) || m.user_id === rule.user_id)
                          .map((member) => (
                            <SelectItem key={member.user_id} value={member.user_id} className="hover:bg-primary/20">
                              {member.username}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    onClick={() => removeRule(actualIndex)}
                    className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0 mt-1"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              );
            })}

          <Button type="button" variant="outline" size="sm" onClick={addUserRule} disabled={members.length === 0} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />
            {s('polls.results_access.add_user')}
          </Button>

          <p className="text-xs text-muted-foreground">{s('polls.results_access.hint')}</p>
        </div>
      )}
    </div>
  );
};
