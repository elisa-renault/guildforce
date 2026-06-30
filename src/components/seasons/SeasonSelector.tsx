import { Archive, CalendarDays, Check, CheckCircle2, ChevronDown, ScrollText } from 'lucide-react';
import { useMemo } from 'react';

import type { GuildSeason, GuildSeasonState } from '@/types/seasons';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { interpolateMessage } from '@/i18n/format';
import { toneBadgeClass, toneTextClass } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

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
  const selectedSeason = sortedSeasons.find((season) => season.id === selectedSeasonId) || null;
  const SelectedIcon = selectedSeason ? stateIcon[selectedSeason.state] : ScrollText;

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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t.seasons.selectSeason}
            disabled={busy}
            className={cn(
              'flex h-7 w-[168px] max-w-[48vw] items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-left text-xs text-foreground transition-colors focus:outline-none focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_1px_hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:w-[280px] md:max-w-[40vw] md:text-sm',
              !selectedSeason && 'text-muted-foreground',
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <SelectedIcon
                className={cn(
                  'h-3.5 w-3.5 flex-shrink-0',
                  selectedSeason?.state === 'active' && 'text-status-success',
                )}
              />
              <span className="min-w-0 flex-1 truncate">{selectedSeason?.name || t.seasons.selectSeason}</span>
              {selectedSeason && (
                <Badge variant="outline" className={cn('h-5 shrink-0 px-1.5 text-[10px]', getSeasonStateBadgeClass(selectedSeason.state))}>
                  {getStateLabel(selectedSeason.state)}
                </Badge>
              )}
            </span>
            <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-50 w-[280px] max-w-[calc(100vw-1rem)] border-border bg-card p-1">
          {sortedSeasons.map((season) => {
            const Icon = stateIcon[season.state];
            const isSelected = season.id === selectedSeasonId;
            return (
              <DropdownMenuItem
                key={season.id}
                onSelect={() => onSelect(season.id)}
                className={cn('cursor-pointer gap-2 rounded-sm px-2 py-1.5 hover:bg-primary/20 focus:bg-primary/20', isSelected && 'bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground')}
              >
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                  <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', season.state === 'active' && 'text-status-success')} />
                  <span className="min-w-0 truncate">{season.name}</span>
                  <Badge variant="outline" className={cn('h-5 shrink-0 px-1.5 text-[10px]', getSeasonStateBadgeClass(season.state))}>
                    {getStateLabel(season.state)}
                  </Badge>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
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
