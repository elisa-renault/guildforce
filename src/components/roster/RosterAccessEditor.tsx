import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
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

export const RosterAccessEditor = ({ accessRules, members, ranks, onChange }: RosterAccessEditorProps) => {
  const { t } = useLanguage();
  
  // Sort ranks by index
  const sortedRanks = [...ranks].sort((a, b) => a.rank_index - b.rank_index);
  const maxRankIndex = sortedRanks.length > 0 ? Math.max(...sortedRanks.map(r => r.rank_index)) : 9;

  const addRankRule = () => {
    onChange([...accessRules, { access_type: 'rank', min_rank_index: 0, max_rank_index: maxRankIndex }]);
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

  const getRankLabel = (index: number) => {
    const rank = sortedRanks.find(r => r.rank_index === index);
    return rank?.rank_name || `Rank ${index}`;
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
          <div key={index} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
            {rule.access_type === 'rank' ? (
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Crown className="h-4 w-4 text-primary" />
                  <span>{t.rosters?.byRank || 'By Rank'}</span>
                </div>
                <div className="px-2">
                  <Slider
                    value={[rule.min_rank_index || 0, rule.max_rank_index || maxRankIndex]}
                    min={0}
                    max={maxRankIndex}
                    step={1}
                    onValueChange={([min, max]) => updateRule(index, { min_rank_index: min, max_rank_index: max })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{getRankLabel(rule.min_rank_index || 0)}</span>
                    <span>{getRankLabel(rule.max_rank_index || maxRankIndex)}</span>
                  </div>
                </div>
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

            <button
              onClick={() => removeRule(index)}
              className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20 transition-colors flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRankRule}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {t.rosters?.addRankRule || 'Add Rank Rule'}
        </Button>
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
