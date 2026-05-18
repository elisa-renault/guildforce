import { useMemo, useState } from 'react';
import { Archive, CalendarDays, CheckCircle2, MoreVertical, Pencil, Play, Plus, ScrollText } from 'lucide-react';

import { CosmicButton } from '@/components/CosmicButton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  canManage?: boolean;
  busy?: boolean;
  onPrepareSeason?: (input: PrepareSeasonInput) => Promise<void>;
  onArchiveSeason?: (seasonId: string) => Promise<void>;
  onActivateSeason?: (seasonId: string) => Promise<void>;
  onRenameSeason?: (seasonId: string, name: string) => Promise<void>;
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
  canManage = false,
  busy = false,
  onPrepareSeason,
  onArchiveSeason,
  onActivateSeason,
  onRenameSeason,
}: SeasonSelectorProps) => {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sourceSeasonId, setSourceSeasonId] = useState('');
  const [prefillWishes, setPrefillWishes] = useState(false);
  const [resetCopiedWishes, setResetCopiedWishes] = useState(true);
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<null | 'archive' | 'activate' | 'rename'>(null);

  const sortedSeasons = useMemo(
    () =>
      [...seasons].sort((a, b) => {
        const stateDiff = stateOrder[a.state] - stateOrder[b.state];
        if (stateDiff !== 0) return stateDiff;
        return (b.activated_at || b.created_at).localeCompare(a.activated_at || a.created_at);
      }),
    [seasons],
  );

  const selectedSeason = seasons.find((season) => season.id === selectedSeasonId) || null;
  const activeSeason = seasons.find((season) => season.state === 'active') || null;
  const sourceOptions = sortedSeasons.filter((season) => season.id !== selectedSeasonId);

  const resetForm = () => {
    setName('');
    setStartsAt('');
    setEndsAt('');
    setSourceSeasonId(activeSeason?.id || '');
    setPrefillWishes(false);
    setResetCopiedWishes(true);
    setActivateImmediately(true);
  };

  const openDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openRenameDialog = () => {
    if (!selectedSeason) return;
    setRenameName(selectedSeason.name);
    setRenameDialogOpen(true);
  };

  const submit = async () => {
    if (!onPrepareSeason || !name.trim()) return;
    setSaving(true);
    try {
      await onPrepareSeason({
        name: name.trim(),
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        sourceSeasonId: sourceSeasonId || activeSeason?.id || null,
        prefillWishes,
        resetCopiedWishes,
        activateImmediately,
      });
      setDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const archiveSelected = async () => {
    if (!selectedSeason || !onArchiveSeason) return;
    if (!window.confirm(t.seasons.confirmArchive)) return;
    setActionBusy('archive');
    try {
      await onArchiveSeason(selectedSeason.id);
    } finally {
      setActionBusy(null);
    }
  };

  const activateSelected = async () => {
    if (!selectedSeason || !onActivateSeason) return;
    setActionBusy('activate');
    try {
      await onActivateSeason(selectedSeason.id);
    } finally {
      setActionBusy(null);
    }
  };

  const renameSelected = async () => {
    if (!selectedSeason || !onRenameSeason || !renameName.trim()) return;
    setActionBusy('rename');
    try {
      await onRenameSeason(selectedSeason.id, renameName.trim());
      setRenameDialogOpen(false);
    } finally {
      setActionBusy(null);
    }
  };

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
    <>
      <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
        <ScrollText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground md:h-4 md:w-4" />
        <Select value={selectedSeasonId || ''} onValueChange={onSelect} disabled={busy}>
          <SelectTrigger
            aria-label={t.seasons.selectSeason}
            className="h-7 w-[150px] max-w-[38vw] border-border bg-card text-xs md:h-8 md:w-[280px] md:max-w-[40vw] md:text-sm"
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
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <CosmicButton
                size="sm"
                variant="outline"
                icon={<MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
                className="h-7 w-7 p-0 md:h-8 md:w-8"
                aria-label={t.common.actions}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-card">
              <DropdownMenuItem onClick={openDialog} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                {t.seasons.prepareNew}
              </DropdownMenuItem>
              {selectedSeason && onRenameSeason && (
                <DropdownMenuItem onClick={openRenameDialog} disabled={actionBusy === 'rename'} className="cursor-pointer">
                  <Pencil className="mr-2 h-4 w-4" />
                  {t.seasons.renameSeason}
                </DropdownMenuItem>
              )}
              {selectedSeason?.state === 'draft' && (
                <DropdownMenuItem onClick={activateSelected} disabled={actionBusy === 'activate'} className="cursor-pointer">
                  <Play className="mr-2 h-4 w-4" />
                  {t.seasons.activateDraft}
                </DropdownMenuItem>
              )}
              {selectedSeason?.state !== 'archived' && (
                <DropdownMenuItem onClick={archiveSelected} disabled={actionBusy === 'archive'} className="cursor-pointer">
                  <Archive className="mr-2 h-4 w-4" />
                  {t.seasons.archiveSeason}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg border-border bg-card">
          <DialogHeader>
            <DialogTitle>{t.seasons.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="season-name">{t.seasons.name}</Label>
              <Input
                id="season-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t.seasons.namePlaceholder}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="season-start">{t.seasons.startsAt}</Label>
                <Input id="season-start" type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="season-end">{t.seasons.endsAt}</Label>
                <Input id="season-end" type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t.seasons.sourceSeason}</Label>
              <Select value={sourceSeasonId || activeSeason?.id || ''} onValueChange={setSourceSeasonId}>
                <SelectTrigger className="border-border bg-background">
                  <SelectValue placeholder={t.seasons.selectSeason} />
                </SelectTrigger>
                <SelectContent className="border-border bg-card">
                  {(sourceOptions.length > 0 ? sourceOptions : sortedSeasons).map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <label className="flex items-start gap-3">
                <Checkbox checked={prefillWishes} onCheckedChange={(checked) => setPrefillWishes(checked === true)} />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{t.seasons.prefillPrevious}</span>
                  <span className="block text-xs text-muted-foreground">{t.seasons.prefillPreviousHint}</span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={resetCopiedWishes}
                  onCheckedChange={(checked) => setResetCopiedWishes(checked === true)}
                  disabled={!prefillWishes}
                />
                <span className="space-y-0.5">
                  <span className={cn('block text-sm font-medium', !prefillWishes && 'text-muted-foreground')}>{t.seasons.resetCopied}</span>
                  <span className="block text-xs text-muted-foreground">{t.seasons.resetCopiedHint}</span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <Checkbox checked={activateImmediately} onCheckedChange={(checked) => setActivateImmediately(checked === true)} />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{t.seasons.activateImmediately}</span>
                  <span className="block text-xs text-muted-foreground">{t.seasons.activateImmediatelyHint}</span>
                </span>
              </label>
            </div>

            {activateImmediately && activeSeason && (
              <div className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-3 text-xs text-status-warning">
                {interpolateMessage(t.seasons.viewingArchived, { season: activeSeason.name })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <CosmicButton variant="outline" onClick={() => setDialogOpen(false)}>
                {t.common.cancel}
              </CosmicButton>
              <CosmicButton onClick={submit} loading={saving} disabled={!name.trim()}>
                {activateImmediately ? t.seasons.startSeason : t.seasons.createDraft}
              </CosmicButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle>{t.seasons.renameDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="season-rename-name">{t.seasons.renameNameLabel}</Label>
              <Input
                id="season-rename-name"
                value={renameName}
                onChange={(event) => setRenameName(event.target.value)}
                placeholder={t.seasons.namePlaceholder}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <CosmicButton variant="outline" onClick={() => setRenameDialogOpen(false)}>
                {t.common.cancel}
              </CosmicButton>
              <CosmicButton onClick={renameSelected} loading={actionBusy === 'rename'} disabled={!renameName.trim()}>
                {t.seasons.renameConfirm}
              </CosmicButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
