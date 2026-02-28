import { Crown, Eye, Plus, Shield, Trash2, Users } from 'lucide-react';

import type {
  GuildSecretAccessLevel,
  GuildSecretAccessRuleDraft,
  GuildSecretAccessRulesCompact,
} from '@/lib/guildVault';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { formatRankLabel } from '@/lib/rankLabel';

interface GuildMemberOption {
  user_id: string;
  username: string;
}

interface GuildRankOption {
  rank_index: number;
  rank_name: string;
}

interface GuildSecretAccessEditorProps {
  value: GuildSecretAccessRulesCompact;
  members: GuildMemberOption[];
  ranks: GuildRankOption[];
  officerRankThreshold?: number;
  onChange: (value: GuildSecretAccessRulesCompact) => void;
}

const SECTION_ORDER: Array<{
  level: GuildSecretAccessLevel;
  icon: typeof Eye;
  tone: string;
  titleKey: 'accessTitle' | 'manageTitle';
  hintKey: 'accessHint' | 'manageHint';
}> = [
  {
    level: 'access',
    icon: Eye,
    tone: 'text-primary',
    titleKey: 'accessTitle',
    hintKey: 'accessHint',
  },
  {
    level: 'manage',
    icon: Shield,
    tone: 'text-primary',
    titleKey: 'manageTitle',
    hintKey: 'manageHint',
  },
];

function getRuleLabel(
  rankIndex: number,
  ranks: GuildRankOption[],
  rankLabel: string,
  guildMasterLabel: string,
) {
  const rank = ranks.find((entry) => entry.rank_index === rankIndex);

  return formatRankLabel({
    rankName: rank?.rank_name,
    rankIndex,
    rankLabel,
    guildMasterLabel,
  });
}

function collectSelectedRanks(rules: GuildSecretAccessRuleDraft[]): number[] {
  const selected = new Set<number>();

  rules.forEach((rule) => {
    if (rule.access_type !== 'rank') return;

    const min = Number.isInteger(rule.min_rank_index) ? Number(rule.min_rank_index) : 0;
    const max = Number.isInteger(rule.max_rank_index) ? Number(rule.max_rank_index) : min;
    const start = Math.min(min, max);
    const end = Math.max(min, max);

    for (let index = start; index <= end; index += 1) {
      selected.add(index);
    }
  });

  return Array.from(selected).sort((left, right) => left - right);
}

export const GuildSecretAccessEditor = ({
  value,
  members,
  ranks,
  officerRankThreshold = 2,
  onChange,
}: GuildSecretAccessEditorProps) => {
  const { t } = useLanguage();
  const vault = t.guildVault;
  const sortedRanks = [...ranks].sort((left, right) => left.rank_index - right.rank_index);
  const rankLabel = resolveSemanticMessage({
    key: 'guild.members.rank_label',
    language: t.lang,
    translations: t,
  });

  const updateLevelRules = (
    level: GuildSecretAccessLevel,
    updater: (rules: GuildSecretAccessRuleDraft[]) => GuildSecretAccessRuleDraft[],
  ) => {
    onChange({
      ...value,
      [level]: updater(value[level]),
    });
  };

  const setSelectedRanks = (level: GuildSecretAccessLevel, nextRanks: number[]) => {
    const normalized = Array.from(new Set(nextRanks)).sort((left, right) => left - right);

    updateLevelRules(level, (rules) => {
      const userRules = rules.filter((rule) => rule.access_type === 'user');
      const rankRules = normalized.map((rankIndex) => ({
        access_type: 'rank' as const,
        min_rank_index: rankIndex,
        max_rank_index: rankIndex,
      }));

      return [...rankRules, ...userRules];
    });
  };

  const toggleRank = (level: GuildSecretAccessLevel, rankIndex: number) => {
    const selectedRanks = collectSelectedRanks(value[level]);
    const nextRanks = selectedRanks.includes(rankIndex)
      ? selectedRanks.filter((entry) => entry !== rankIndex)
      : [...selectedRanks, rankIndex];

    setSelectedRanks(level, nextRanks);
  };

  const addUserRule = (level: GuildSecretAccessLevel) => {
    const selectedUserIds = value[level]
      .filter((rule) => rule.access_type === 'user')
      .map((rule) => rule.user_id)
      .filter(Boolean);

    const nextMember = members.find((member) => !selectedUserIds.includes(member.user_id));
    if (!nextMember) return;

    updateLevelRules(level, (rules) => [
      ...rules,
      { access_type: 'user', user_id: nextMember.user_id },
    ]);
  };

  const updateUserRule = (
    level: GuildSecretAccessLevel,
    currentUserId: string | undefined,
    nextUserId: string,
  ) => {
    updateLevelRules(level, (rules) =>
      rules.map((rule) => {
        if (rule.access_type !== 'user' || rule.user_id !== currentUserId) {
          return rule;
        }

        return {
          access_type: 'user',
          user_id: nextUserId,
        };
      }),
    );
  };

  const removeUserRule = (level: GuildSecretAccessLevel, userId: string | undefined) => {
    updateLevelRules(level, (rules) =>
      rules.filter((rule) => !(rule.access_type === 'user' && rule.user_id === userId)),
    );
  };

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {SECTION_ORDER.map(({ level, icon: Icon, tone, titleKey, hintKey }) => {
        const rules = value[level];
        const selectedRanks = collectSelectedRanks(rules);
        const userRules = rules.filter((rule) => rule.access_type === 'user');
        const selectedUserIds = userRules.map((rule) => rule.user_id).filter(Boolean);
        const officerRanks = sortedRanks.filter((rank) => rank.rank_index <= officerRankThreshold);
        const memberRanks = sortedRanks.filter((rank) => rank.rank_index > officerRankThreshold);
        const rankGroups = [
          { key: 'officers', ranks: officerRanks, showCrown: true },
          { key: 'members', ranks: memberRanks, showCrown: false },
        ].filter((group) => group.ranks.length > 0);

        return (
          <div key={level} className="space-y-3 rounded-lg border border-border/40 bg-card/40 p-3">
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
              <div className="min-w-0">
                <h4 className="text-sm font-medium">{vault.access[titleKey]}</h4>
                <p className="text-xs text-muted-foreground">{vault.access[hintKey]}</p>
              </div>
            </div>

            <div className="space-y-3">
              {selectedRanks.length === 0 && userRules.length === 0 && (
                <p className="text-xs text-muted-foreground">{vault.access.empty}</p>
              )}

              <div className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {vault.access.byRank}
                </span>

                {sortedRanks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{vault.access.noRanks}</p>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border/30 bg-background/30 p-2">
                    {rankGroups.map((group) => (
                      <div key={`${level}-${group.key}`} className="space-y-2">
                        <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {group.showCrown && <Crown className="h-3 w-3 text-warning" />}
                          <span>{group.showCrown ? vault.access.officerRanks : vault.access.memberRanks}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.ranks.map((rank) => {
                            const isSelected = selectedRanks.includes(rank.rank_index);
                            const label = getRuleLabel(
                              rank.rank_index,
                              sortedRanks,
                              rankLabel,
                              t.guild.rank0,
                            );

                            return (
                              <button
                                key={`${level}-${rank.rank_index}`}
                                type="button"
                                onClick={() => toggleRank(level, rank.rank_index)}
                                className={[
                                  'rounded-md border px-2 py-1 text-xs transition-colors',
                                  isSelected
                                    ? 'border-primary/60 bg-primary/15 text-primary'
                                    : 'border-border/40 bg-background/20 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                                ].join(' ')}
                                title={label}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {vault.access.byUser}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addUserRule(level)}
                    disabled={members.length === 0 || selectedUserIds.length >= members.length}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {vault.access.addUserRule}
                  </Button>
                </div>

                {userRules.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{vault.access.selectUser}</p>
                ) : (
                  <div className="space-y-2">
                    {userRules.map((rule) => (
                      <div key={`${level}-${rule.user_id}`} className="flex items-center gap-2">
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <Select
                          value={rule.user_id || ''}
                          onValueChange={(nextUserId) =>
                            updateUserRule(level, rule.user_id ?? undefined, nextUserId)
                          }
                        >
                          <SelectTrigger className="h-9 bg-card border-border">
                            <SelectValue placeholder={vault.access.selectUser} />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {members
                              .filter(
                                (member) =>
                                  !selectedUserIds.includes(member.user_id) || member.user_id === rule.user_id,
                              )
                              .map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.username}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeUserRule(level, rule.user_id ?? undefined)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
