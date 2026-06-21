import { useMemo } from 'react';
import { Archive, CalendarDays, CheckCircle2, ScrollText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolateMessage } from '@/i18n/format';
import { toneBadgeClass, toneTextClass } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { GuildSeason, GuildSeasonState } from '@/types/seasons';

interface SeasonSelectorProps {
  seasons: GuildSeason[];
  selectedSeasonId: string | null;
  onSelect: (seasonId: string) => void;
  emptyLabel?: string;
  busy?: boolean;
}

export interface PrepareSeasonInput {
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  sourceSeasonId: string | null;
  prefillWishes: boolean;
  resetCopiedWishes: boolean;
  activateImmediately: boolean;
}

const stateOrder: Record<GuildSeasonState, number> = {
  active: 0,
  draft: 1,
  archived: 2,
};

const stateIcon = {
  active: CheckCircle2,
  draft: CalendarDays,
  archived: Archive,
} satisfies Record<GuildSeasonState, typeof Archive>;

export const getSeasonStateBadgeClass = (state: GuildSeasonState) => {
  if (state === 'active') return 'border-status-success/30 bg-status-success/10 text-status-success';
  if (state === 'draft') return toneBadgeClass('info');
  return 'border-border/50 bg-muted/40 text-muted-foreground';
};

export const SeasonSelector = ({
  seasons,
  selectedSeasonId,
  onSelect,
  emptyLabel,
  busy = false,
}: SeasonSelectorProps) => {
  const { t } = useLanguage();

  const sortedSeasons = useMemo(
    () =>
      [...seasons].sort((a, b) => {
        const stateDiff = stateOrder[a.state] - stateOrder[b.state];
        if (stateDiff !== 0) return stateDiff;
        return (b.activated_at || b.created_at).localeCompare(a.activated_at || a.created_at);
      }),
    [seasons],
  );

  const getStateLabel = (state: GuildSeasonState) => {
    if (state === 'active') return t.seasons.active;
    if (state === 'draft') return t.seasons.draft;
    return t.seasons.archived;
  };

  if (seasons.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScrollText className="h-4 w-4" />
        {emptyLabel || t.seasons.noSeason}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
      <ScrollText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground md:h-4 md:w-4" />
      <Select value={selectedSeasonId || ''} onValueChange={onSelect} disabled={busy}>
        <SelectTrigger
          aria-label={t.seasons.selectSeason}
          className="h-7 w-[168px] max-w-[48vw] border-border bg-card text-xs focus:ring-0 focus:ring-offset-0 focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_1px_hsl(var(--primary))] md:h-8 md:w-[280px] md:max-w-[40vw] md:text-sm"
        >
          <SelectValue placeholder={t.seasons.selectSeason} />
        </SelectTrigger>
        <SelectContent className="z-50 border-border bg-card">
          {sortedSeasons.map((season) => {
            const Icon = stateIcon[season.state];
            return (
              <SelectItem key={season.id} value={season.id} className="hover:bg-primary/20">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', season.state === 'active' && 'text-status-success')} />
                  <span className="truncate">{season.name}</span>
                  <Badge variant="outline" className={cn('ml-auto h-5 px-1.5 text-[10px]', getSeasonStateBadgeClass(season.state))}>
                    {getStateLabel(season.state)}
                  </Badge>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export const SeasonStateCallout = ({ season }: { season: GuildSeason }) => {
  const { t } = useLanguage();
  const Icon = stateIcon[season.state];

  if (season.state === 'active') return null;

  const message =
    season.state === 'archived'
      ? interpolateMessage(t.seasons.viewingArchived, { season: season.name })
      : interpolateMessage(t.seasons.viewingDraft, { season: season.name });

  return (
    <div
      className={cn(
        'mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm',
        season.state === 'archived'
          ? 'border-border/60 bg-muted/30 text-muted-foreground'
          : 'border-status-info/30 bg-status-info/10',
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4', season.state === 'draft' ? toneTextClass('info') : 'text-muted-foreground')} />
      <div>
        <div className="font-medium">{season.state === 'archived' ? t.seasons.archived : t.seasons.draft}</div>
        <div className="opacity-85">{message}</div>
      </div>
    </div>
  );
};
