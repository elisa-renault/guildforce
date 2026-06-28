import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { GuildMainSelector, type GuildMainCandidate } from '@/components/guild/GuildMainSelector';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataListSkeleton } from '@/components/ui/data-list-skeleton';
import { HelpCircle, XCircle, X, Pencil, Save, Shield, Heart, Sword, Swords, Crosshair, MessageSquare, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Lock, Unlock, MoreVertical, Loader2, UserPlus, History, UserCheck, UserMinus, UserX, CheckCircle2, Armchair, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { MemberWish, RosterSelectionStatus, WishData, WishChoice, ValidationStatus } from '@/types/guild';
import { InlineWishEditor } from './InlineWishEditor';
import { WishValidationBadge } from './WishValidationBadge';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { MobileRosterCard } from './MobileRosterCard';
import { RosterDecisionToggle } from './RosterDecisionToggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { commitmentBadgeClass } from '@/lib/design-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SortColumn = 'player' | 'status' | 'rosterDecision' | 'wish1' | 'wish2' | 'wish3' | 'wishesCount';
type SortDirection = 'asc' | 'desc';
export type RosterTableColumnId = 'status' | 'rosterDecision' | 'wishesCount' | 'wish1' | 'wish2' | 'wish3';

const defaultVisibleColumns: RosterTableColumnId[] = [
  'status',
  'rosterDecision',
  'wishesCount',
  'wish1',
  'wish2',
  'wish3',
];

interface RosterTableProps {
  members: MemberWish[];
  loading?: boolean;
  guildId?: string | null;
  currentUserId: string | undefined;
  selectedRosterId?: string | null;
  selectedSeasonId?: string | null;
  editingUserId: string | null;
  editWishes: WishData[];
  editStatus: CommitmentStatus;
  editSelectionStatus: RosterSelectionStatus;
  editGuildMainKey?: string | null;
  saving: boolean;
  maxWishes: number;
  canManageWishes?: boolean;
  canManageMembers?: boolean;
  onGuildMainChanged?: () => void;
  isRosterLocked?: boolean;
  isEditingLocked?: boolean;
  onStartEditing: (member: MemberWish) => void;
  onUpdateEditWish: (
    index: number,
    field: keyof WishData,
    value: WishData[keyof WishData]
  ) => void;
  onEditStatusChange: (status: CommitmentStatus) => void;
  onEditSelectionStatusChange: (status: RosterSelectionStatus) => void;
  onEditGuildMainChange: (candidate: GuildMainCandidate) => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onAddWish: () => void;
  onRemoveWish: (index: number) => void;
  onClearWish: (index: number) => void;
  onValidateWish?: (userId: string, choiceIndex: number, status: ValidationStatus) => void;
  onToggleMemberLock?: (memberId: string, locked: boolean) => void;
  lockingMemberId?: string | null;
  onRemoveMember?: (memberId: string) => void;
  deletingMemberId?: string | null;
  onSelectionStatusChange?: (memberId: string, status: RosterSelectionStatus) => void;
  updatingSelectionMemberId?: string | null;
  onViewHistory?: (member: MemberWish) => void;
  onSortSummaryChange?: (summary: string) => void;
  visibleColumns?: RosterTableColumnId[];
}

// Role config for icons
const roleConfig: Record<string, { icon: typeof Shield; color: string }> = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  dps: { icon: Sword, color: 'text-dps' },
};

export const RosterTable = ({
  members,
  loading = false,
  guildId = null,
  currentUserId,
  selectedRosterId,
  selectedSeasonId,
  editingUserId,
  editWishes,
  editStatus,
  editSelectionStatus,
  editGuildMainKey = null,
  saving,
  maxWishes,
  canManageWishes = false,
  canManageMembers = false,
  onGuildMainChanged,
  isRosterLocked = false,
  isEditingLocked = false,
  onStartEditing,
  onUpdateEditWish,
  onEditStatusChange,
  onEditSelectionStatusChange,
  onEditGuildMainChange,
  onSaveEditing,
  onCancelEditing,
  onAddWish,
  onRemoveWish,
  onClearWish,
  onValidateWish,
  onToggleMemberLock,
  lockingMemberId = null,
  onRemoveMember,
  deletingMemberId = null,
  onSelectionStatusChange,
  updatingSelectionMemberId = null,
  onViewHistory,
  onSortSummaryChange,
  visibleColumns = defaultVisibleColumns,
}: RosterTableProps) => {
  const wishColumnClassName = 'w-[210px] min-w-[210px]';
  const actionColumnClassName = 'w-[92px] min-w-[92px]';
  const actionColumnWidth = 92;
  const cellPaddingClassName = 'px-1 py-1';
  const isColumnVisible = (column: RosterTableColumnId) => visibleColumns.includes(column);
  const visibleDataColumnCount = visibleColumns.length;
  const leadingColSpan = 1 + Number(isColumnVisible('status')) + Number(isColumnVisible('rosterDecision')) + Number(isColumnVisible('wishesCount'));
  const tableMinWidth = 160
    + (isColumnVisible('status') ? 118 : 0)
    + (isColumnVisible('rosterDecision') ? 160 : 0)
    + (isColumnVisible('wishesCount') ? 82 : 0)
    + (isColumnVisible('wish1') ? 210 : 0)
    + (isColumnVisible('wish2') ? 210 : 0)
    + (isColumnVisible('wish3') ? 210 : 0)
    + actionColumnWidth;
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const isMobile = useIsMobile();
  const [validatingWish, setValidatingWish] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('wishesCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const rosterTableLabels = t.dashboard.rosterTable;
  const manualEntryHelp = rosterTableLabels.manualEntryHelp;
  const sortColumnLabels: Record<SortColumn, string> = {
    player: rosterTableLabels.player,
    status: rosterTableLabels.status,
    rosterDecision: rosterTableLabels.decision,
    wishesCount: rosterTableLabels.total,
    wish1: rosterTableLabels.choice1,
    wish2: rosterTableLabels.choice2,
    wish3: rosterTableLabels.choice3,
  };
  const sortSummary = sortColumn
    ? (sortDirection === 'asc' ? rosterTableLabels.sortAscending : rosterTableLabels.sortDescending)
      .replace('{{column}}', sortColumnLabels[sortColumn])
    : '';

  useEffect(() => {
    onSortSummaryChange?.(sortSummary);
  }, [onSortSummaryChange, sortSummary]);

  const getRosterDecisionBadge = (selectionStatus: MemberWish['selectionStatus']) => {
    switch (selectionStatus) {
      case 'selected':
        return {
          label: t.wishes.rosterDecision.selected,
          icon: CheckCircle2,
          className: 'bg-healer/20 text-healer border-healer/30',
        };
      case 'bench':
        return {
          label: t.wishes.rosterDecision.bench,
          icon: Armchair,
          className: 'bg-warning/20 text-warning border-warning/30',
        };
      case 'not_selected':
        return {
          label: t.wishes.rosterDecision.notSelected,
          icon: XCircle,
          className: 'bg-destructive/20 text-destructive border-destructive/30',
        };
      default:
        return {
          label: t.wishes.rosterDecision.undecided,
          icon: Clock,
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Helper to get class name for sorting
  const getWishClassName = (wishes: WishChoice[], choiceIndex: number): string => {
    const wish = wishes.find(w => w.choice_index === choiceIndex);
    if (!wish) return '';
    const cls = getClassById(wish.class_id);
    return cls ? getLocalizedClassName(cls.id, language).toLowerCase() : '';
  };

  // Sort members
  const sortedMembers = useMemo(() => {
    if (!sortColumn) return members;

    // Status priority: confirmed (0) > potential/undecided (1) > withdrawn (2)
    const statusOrder = { confirmed: 0, potential: 1, withdrawn: 2 };
    // Roster decision priority: selected > bench > undecided > not_selected
    const rosterDecisionOrder = { selected: 0, bench: 1, undecided: 2, not_selected: 3 } as const;

    return [...members].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'player':
          comparison = a.username.toLowerCase().localeCompare(b.username.toLowerCase());
          break;
        case 'status':
          comparison = (statusOrder[a.status as keyof typeof statusOrder] ?? 1) - (statusOrder[b.status as keyof typeof statusOrder] ?? 1);
          break;
        case 'rosterDecision': {
          const decisionA = a.selectionStatus || 'undecided';
          const decisionB = b.selectionStatus || 'undecided';
          comparison = (rosterDecisionOrder[decisionA] ?? 2) - (rosterDecisionOrder[decisionB] ?? 2);
          break;
        }
        case 'wish1':
          comparison = getWishClassName(a.wishes, 1).localeCompare(getWishClassName(b.wishes, 1));
          break;
        case 'wish2':
          comparison = getWishClassName(a.wishes, 2).localeCompare(getWishClassName(b.wishes, 2));
          break;
        case 'wish3':
          comparison = getWishClassName(a.wishes, 3).localeCompare(getWishClassName(b.wishes, 3));
          break;
        case 'wishesCount': {
          const countA = a.wishes.filter(w => w.class_id).length;
          const countB = b.wishes.filter(w => w.class_id).length;
          comparison = countA - countB;
          break;
        }
      }

      // Apply sort direction to primary comparison
      const primaryResult = sortDirection === 'asc' ? comparison : -comparison;

      // Secondary sort by engagement status (always: confirmed → potential → withdrawn)
      if (primaryResult === 0 && sortColumn !== 'status') {
        const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 1;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 1;
        return statusA - statusB;
      }

      return primaryResult;
    });
  }, [members, sortColumn, sortDirection, language]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    const isActive = sortColumn === column;
    const Icon = isActive
      ? (sortDirection === 'asc' ? ArrowUp : ArrowDown)
      : ArrowUpDown;

    return (
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-opacity',
          isActive
            ? 'text-primary opacity-100'
            : 'text-muted-foreground/50 opacity-0 group-hover/header:opacity-100'
        )}
      />
    );
  };

  const HeaderHelp = ({ tooltip }: { tooltip?: string }) => {
    if (!tooltip) return null;

    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              onClick={(event) => event.stopPropagation()}
              aria-label={tooltip}
            >
              <HelpCircle className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const SortableHeader = ({
    column,
    children,
    className,
    tooltip,
  }: {
    column: SortColumn;
    children: React.ReactNode;
    className?: string;
    tooltip?: string;
  }) => {
    const isActive = sortColumn === column;
    const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <TableHead
        aria-sort={ariaSort}
        className={cn(
          'group/header cursor-pointer select-none px-1.5 py-1 text-xs transition-colors',
          isActive
            ? 'bg-primary/5 text-foreground'
            : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
          className
        )}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap">{children}</span>
          <HeaderHelp tooltip={tooltip} />
          <SortIcon column={column} />
        </div>
      </TableHead>
    );
  };

  const handleValidation = async (memberId: string, choiceIndex: number, status: ValidationStatus) => {
    if (!onValidateWish) return;
    setValidatingWish(`${memberId}-${choiceIndex}`);
    await onValidateWish(memberId, choiceIndex, status);
    setValidatingWish(null);
  };

  const renderWishCell = (memberId: string, wishes: WishChoice[], choiceIndex: number, isExternal = false) => {
    const wish = wishes.find(w => w.choice_index === choiceIndex);
    
    // Empty state matching editor structure
    if (!wish) {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="h-7 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/30">{t.wishes.selectClass}</span>
          </div>
          <div className="h-5 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground/20" />
            <Heart className="h-3 w-3 text-muted-foreground/20" />
            <Swords className="h-3 w-3 text-muted-foreground/20" />
          </div>
        </div>
      );
    }

    const cls = getClassById(wish.class_id);
    if (!cls) {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="h-7 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/30">{t.wishes.selectClass}</span>
          </div>
          <div className="h-5 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center gap-1">
            <Shield className="h-3 w-3 text-muted-foreground/20" />
            <Heart className="h-3 w-3 text-muted-foreground/20" />
            <Swords className="h-3 w-3 text-muted-foreground/20" />
          </div>
        </div>
      );
    }

    // Get specs with their details
    const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean);
    const validationStatus = wish.validation_status || 'pending';
    const isValidating = validatingWish === `${memberId}-${choiceIndex}`;

    return (
      <div className="flex min-w-0 flex-col gap-1">
        {/* Class with validation badge */}
        <div className="flex min-w-0 items-center gap-1">
          <div 
            className="h-7 min-w-0 flex-1 rounded-md flex items-center px-1.5 text-xs font-medium"
            style={{ 
              backgroundColor: `hsl(var(--class-${cls.id}) / 0.2)`,
              color: `hsl(var(--class-${cls.id}))`
            }}
          >
            <span className="truncate">{getLocalizedClassName(cls.id, language)}</span>
          </div>
          
          {/* Validation badge */}
          <WishValidationBadge
            status={validationStatus}
            validatedBy={wish.validated_by_username}
            validatedAt={wish.validated_at}
            isGM={canManageWishes && !isExternal}
            onValidate={(status) => handleValidation(memberId, choiceIndex, status)}
            loading={isValidating}
            compact
          />
        </div>
        
        {/* Spec row - display all selected specs */}
        <div className="min-h-5 w-full flex items-center gap-x-1 gap-y-0.5 text-[10px] flex-wrap overflow-hidden">
          {specs.length > 0 ? (
            specs.map((spec) => {
              const config = roleConfig[spec.role];
              // Use dynamic icon for DPS based on range
              const Icon = spec.role === 'dps' 
                ? (spec.range === 'ranged' ? Crosshair : Swords)
                : config?.icon;
              return (
                <div key={spec.id} className="flex min-w-0 items-center gap-0.5">
                  {Icon && <Icon className={cn("h-2.5 w-2.5 flex-shrink-0", config?.color)} />}
                  <span className="truncate text-muted-foreground">{getLocalizedSpecName(spec.id, language)}</span>
                </div>
              );
            })
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
          
          {/* Comment icon with tooltip */}
          {wish.comment && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MessageSquare className="h-2.5 w-2.5 text-primary flex-shrink-0 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {wish.comment}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  const renderEditWishCell = (wishIndex: number, canRemove: boolean) => {
    const wish = editWishes[wishIndex];
    if (!wish) return null;
    
    // Get all used class IDs except the current wish's class
    const usedClassIds = editWishes
      .filter((_, i) => i !== wishIndex)
      .map(w => w.classId)
      .filter(Boolean);
    
    const hasContent = wish.classId || wish.specIds.length > 0 || wish.comment;
    
    return (
      <div className="flex items-start gap-1">
        <div className="flex-1">
          <InlineWishEditor
            wish={wish}
            choiceIndex={wishIndex}
            onChange={(field, value) => onUpdateEditWish(wishIndex, field, value)}
            usedClassIds={usedClassIds}
            disabled={isEditingLocked}
          />
        </div>
        {canRemove ? (
          <button
            onClick={() => onRemoveWish(wishIndex)}
            disabled={isEditingLocked}
            className={cn(
              "h-7 w-7 flex items-center justify-center transition-colors rounded",
              isEditingLocked ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-destructive"
            )}
            title={t.common.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : hasContent && (
          <button
            onClick={() => onClearWish(wishIndex)}
            disabled={isEditingLocked}
            className={cn(
              "h-7 w-7 flex items-center justify-center transition-colors rounded",
              isEditingLocked ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground/50 hover:text-muted-foreground"
            )}
            title={t.common.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  const SkeletonBar = ({ className }: { className: string }) => (
    <div className={cn('animate-pulse rounded-md bg-muted/45', className)} />
  );

  const renderSkeletonWishCell = (variant: 0 | 1 | 2) => {
    const classWidths = ['w-[62%]', 'w-[74%]', 'w-[54%]'] as const;
    const validationWidths = ['w-[72px]', 'w-[82px]', 'w-[64px]'] as const;
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1">
          <SkeletonBar className={cn('h-7 min-w-0 flex-1', classWidths[variant])} />
          <SkeletonBar className={cn('h-7 shrink-0', validationWidths[variant])} />
        </div>
        <div className="flex min-h-5 items-center gap-1">
          <SkeletonBar className="h-2.5 w-2.5 rounded-full" />
          <SkeletonBar className="h-3 w-16" />
          {variant !== 2 && (
            <>
              <SkeletonBar className="h-2.5 w-2.5 rounded-full" />
              <SkeletonBar className="h-3 w-12" />
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    if (!isMobile) {
      return (
        <GlowCard surface="section" className="overflow-hidden !p-1 md:!p-2">
          <div className="overflow-x-auto">
            <Table className="table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="w-[160px] px-1.5 py-1 text-xs text-muted-foreground">{rosterTableLabels.player}</TableHead>
                  {isColumnVisible('status') && (
                    <TableHead className="w-[118px] px-1.5 py-1 text-xs text-muted-foreground">{rosterTableLabels.status}</TableHead>
                  )}
                  {isColumnVisible('rosterDecision') && (
                    <TableHead className="w-[160px] px-1.5 py-1 text-xs text-muted-foreground">{rosterTableLabels.decision}</TableHead>
                  )}
                  {isColumnVisible('wishesCount') && (
                    <TableHead className="w-[82px] px-1.5 py-1 text-xs text-muted-foreground">{rosterTableLabels.total}</TableHead>
                  )}
                  {isColumnVisible('wish1') && (
                    <TableHead className={cn('px-1.5 py-1 text-xs text-muted-foreground', wishColumnClassName)}>{rosterTableLabels.choice1}</TableHead>
                  )}
                  {isColumnVisible('wish2') && (
                    <TableHead className={cn('px-1.5 py-1 text-xs text-muted-foreground', wishColumnClassName)}>{rosterTableLabels.choice2}</TableHead>
                  )}
                  {isColumnVisible('wish3') && (
                    <TableHead className={cn('px-1.5 py-1 text-xs text-muted-foreground', wishColumnClassName)}>{rosterTableLabels.choice3}</TableHead>
                  )}
                  <TableHead className="w-[48px] px-1 py-1 text-xs text-muted-foreground" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <TableRow key={rowIndex} className="border-border/20">
                    <TableCell className="px-1.5 py-1">
                      <div className="flex min-w-0 flex-col gap-1">
                        <SkeletonBar className="h-4 w-20" />
                        <SkeletonBar className="h-3 w-16" />
                      </div>
                    </TableCell>
                    {isColumnVisible('status') && (
                      <TableCell className={cellPaddingClassName}>
                        <SkeletonBar className="h-6 w-[86px] rounded-full" />
                      </TableCell>
                    )}
                    {isColumnVisible('rosterDecision') && (
                      <TableCell className={cellPaddingClassName}>
                        <SkeletonBar className="h-8 w-full" />
                      </TableCell>
                    )}
                    {isColumnVisible('wishesCount') && (
                      <TableCell className="px-1 py-1 text-center">
                        <SkeletonBar className="mx-auto h-4 w-4" />
                      </TableCell>
                    )}
                    {isColumnVisible('wish1') && (
                      <TableCell className={cn(cellPaddingClassName, wishColumnClassName)}>
                        {renderSkeletonWishCell((rowIndex % 3) as 0 | 1 | 2)}
                      </TableCell>
                    )}
                    {isColumnVisible('wish2') && (
                      <TableCell className={cn(cellPaddingClassName, wishColumnClassName)}>
                        {renderSkeletonWishCell(((rowIndex + 1) % 3) as 0 | 1 | 2)}
                      </TableCell>
                    )}
                    {isColumnVisible('wish3') && (
                      <TableCell className={cn(cellPaddingClassName, wishColumnClassName)}>
                        {renderSkeletonWishCell(((rowIndex + 2) % 3) as 0 | 1 | 2)}
                      </TableCell>
                    )}
                    <TableCell className="px-1 py-1">
                      <div className="flex justify-end">
                        <SkeletonBar className="h-9 w-9" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </GlowCard>
      );
    }

    return (
      <GlowCard surface="section" className="overflow-hidden">
        <DataListSkeleton
          rows={isMobile ? 3 : 6}
          showToolbar={false}
          showMeta={false}
          variant={isMobile ? 'cards' : 'table'}
          framed={false}
          className="p-3"
        />
      </GlowCard>
    );
  }

  if (members.length === 0) {
    return (
      <GlowCard surface="section" className="overflow-hidden">
        <div className="text-center py-16 text-muted-foreground">{t.dashboard.noData}</div>
      </GlowCard>
    );
  }

  // Mobile view - card layout
  if (isMobile) {
    return (
      <div className="space-y-2">
        {members.map((member) => {
          const isOwnRow = member.id === currentUserId;

          const handleCardClick = () => {
            if (member.isExternal) return;
            if (regionSlug && serverSlug && guildSlug) {
              const qp = selectedRosterId ? `?rosterId=${encodeURIComponent(selectedRosterId)}` : '';
              const seasonParam = selectedSeasonId ? `${qp ? '&' : '?'}seasonId=${encodeURIComponent(selectedSeasonId)}` : '';
              navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/member/${member.id}${qp}${seasonParam}`);
            }
          };

          // Mobile doesn't support inline editing in the roster table.
          // So we redirect the user to the dedicated Wishes editor page.
          const handleStartEditing = () => {
            if (!regionSlug || !serverSlug || !guildSlug || member.isExternal) return;

            const qp = selectedRosterId ? `?rosterId=${encodeURIComponent(selectedRosterId)}` : '';
            const seasonParam = selectedSeasonId ? `${qp ? '&' : '?'}seasonId=${encodeURIComponent(selectedSeasonId)}` : '';
            if (isOwnRow && !canManageWishes) {
              const editParam = `${qp || seasonParam ? '&' : '?'}edit=my-wishes`;
              navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/roster${qp}${seasonParam}${editParam}`);
              return;
            }
            navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/member/${member.id}${qp}${seasonParam}`);
          };

          return (
            <MobileRosterCard
              key={member.id}
              member={member}
              isOwnRow={isOwnRow}
              canManageWishes={canManageWishes}
              isRosterLocked={isRosterLocked}
              onStartEditing={handleStartEditing}
              onValidateWish={onValidateWish}
              onClick={handleCardClick}
              onToggleMemberLock={onToggleMemberLock}
              lockingMemberId={lockingMemberId}
              onRemoveMember={onRemoveMember}
              deletingMemberId={deletingMemberId}
              onSelectionStatusChange={onSelectionStatusChange}
              updatingSelectionMemberId={updatingSelectionMemberId}
              onViewHistory={onViewHistory}
            />
          );
        })}
      </div>
    );
  }
  // Desktop view - table layout
  return (
    <GlowCard surface="section" className="overflow-hidden !p-1 md:!p-2">
      <div className="overflow-x-auto">
        <Table className="table-fixed" style={{ minWidth: `${tableMinWidth}px` }}>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <SortableHeader column="player" className="w-[160px]">{rosterTableLabels.player}</SortableHeader>
              {isColumnVisible('status') && (
                <SortableHeader column="status" className="w-[118px]" tooltip={rosterTableLabels.statusTooltip}>
                  {rosterTableLabels.status}
                </SortableHeader>
              )}
              {isColumnVisible('rosterDecision') && (
                <SortableHeader column="rosterDecision" className="w-[160px]" tooltip={rosterTableLabels.decisionTooltip}>
                  {rosterTableLabels.decision}
                </SortableHeader>
              )}
              {isColumnVisible('wishesCount') && (
                <SortableHeader column="wishesCount" className="w-[82px]" tooltip={rosterTableLabels.totalTooltip}>
                  <span className="hidden md:inline">{rosterTableLabels.total}</span><span className="md:hidden">#</span>
                </SortableHeader>
              )}
              {isColumnVisible('wish1') && (
                <SortableHeader column="wish1" className={wishColumnClassName}><span className="hidden md:inline">{rosterTableLabels.choice1}</span><span className="md:hidden">#1</span></SortableHeader>
              )}
              {isColumnVisible('wish2') && (
                <SortableHeader column="wish2" className={wishColumnClassName}><span className="hidden md:inline">{rosterTableLabels.choice2}</span><span className="md:hidden">#2</span></SortableHeader>
              )}
              {isColumnVisible('wish3') && (
                <SortableHeader column="wish3" className={wishColumnClassName}><span className="hidden md:inline">{rosterTableLabels.choice3}</span><span className="md:hidden">#3</span></SortableHeader>
              )}
              <TableHead className={cn(actionColumnClassName, 'px-1 py-1 text-xs text-muted-foreground')}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => {
              const isOwnRow = member.id === currentUserId;
              const isEditing = editingUserId === member.id;
              const memberLocked = Boolean(member.wishes_locked);
              const effectiveLocked = isRosterLocked || memberLocked;
              const lockTooltip = isRosterLocked
                ? t.wishes.lockedRosterDesc
                : memberLocked
                  ? t.wishes.lockedMemberDesc
                  : '';

              const rowActions = isEditing ? [] : [
                ...(canManageWishes && onViewHistory && member.seasonMemberId ? [{
                  key: 'history',
                  label: t.wishes.memberDetail.history,
                  icon: History,
                  onClick: () => onViewHistory(member),
                  loading: false,
                  disabled: false,
                }] : []),
                ...(canManageWishes && onRemoveMember && !isOwnRow ? [{
                  key: 'delete',
                  label: t.wishes.removeMember,
                  icon: Trash2,
                  onClick: () => onRemoveMember(member.id),
                  loading: deletingMemberId === member.id,
                  disabled: false,
                }] : []),
                ...(canManageWishes && onToggleMemberLock && !member.isExternal ? [{
                  key: 'lock',
                  label: memberLocked ? t.wishes.unlockMember : t.wishes.lockMember,
                  icon: memberLocked ? Unlock : Lock,
                  onClick: () => onToggleMemberLock(member.id, !memberLocked),
                  loading: lockingMemberId === member.id,
                  disabled: false,
                }] : []),
                ...((isOwnRow || canManageWishes) && !isEditingLocked ? [{
                  key: 'edit',
                  label: t.common.edit,
                  icon: Pencil,
                  onClick: () => {
                    onStartEditing(member);
                  },
                  loading: false,
                  disabled: false,
                }] : []),
              ];
              const playerSubtitle = member.mainCharacterName;
              const canEditGuildMain = !member.isExternal && (isOwnRow || canManageMembers);

              const handleRowClick = () => {
                // Navigate to member wishes page (read-only view) for all members
                if (!isEditing && regionSlug && serverSlug && guildSlug) {
                  if (member.isExternal) return;
                  const qp = selectedRosterId ? `?rosterId=${encodeURIComponent(selectedRosterId)}` : '';
                  const seasonParam = selectedSeasonId ? `${qp ? '&' : '?'}seasonId=${encodeURIComponent(selectedSeasonId)}` : '';
                  navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/member/${member.id}${qp}${seasonParam}`);
                }
              };
              
              return (
                <Fragment key={member.id}>
                  <TableRow 
                    className={cn(
                      "border-border/20",
                      isOwnRow ? "bg-primary/[0.02]" : "",
                      isEditing && "bg-primary/[0.05]",
                      !isEditing && "cursor-pointer hover:bg-primary/[0.05]"
                    )}
                    onClick={handleRowClick}
                  >
                    <TableCell className="px-1.5 py-1 text-sm font-medium text-foreground">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 truncate">{member.username}</span>
                          {isEditing && canEditGuildMain && (
                            <GuildMainSelector
                              guildId={guildId}
                              memberId={member.id}
                              canEdit={canEditGuildMain}
                              compact
                              deferredSelectionKey={editGuildMainKey}
                              onDeferredSelect={onEditGuildMainChange}
                              onChanged={onGuildMainChanged}
                            />
                          )}
                          {member.isExternal && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-primary/40 text-primary bg-primary/10">
                                    <UserPlus className="h-3 w-3" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[240px]">
                                  {manualEntryHelp}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {playerSubtitle && (
                          <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <span className="truncate text-foreground/80">{playerSubtitle}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isColumnVisible('status') && (
                    <TableCell className={cellPaddingClassName}>
                      {isEditing ? (
                        <CommitmentToggle 
                          status={editStatus} 
                          onChange={onEditStatusChange}
                          compact
                          asBadge
                          disabled={isEditingLocked}
                        />
                      ) : (
                        <Badge 
                          variant="outline"
                          className={cn(
                            "px-2.5 py-0.5 text-[10px] md:text-xs whitespace-nowrap",
                            member.status === 'confirmed' 
                              ? commitmentBadgeClass('confirmed')
                              : member.status === 'withdrawn'
                              ? commitmentBadgeClass('withdrawn')
                              : commitmentBadgeClass('undecided')
                          )}
                        >
                          {member.status === 'confirmed' ? (
                            <><UserCheck className="h-3 w-3" strokeWidth={1.5} /><span className="hidden md:inline ml-1">{t.wishes.commitment.confirmed}</span></>
                          ) : member.status === 'withdrawn' ? (
                            <><UserX className="h-3 w-3" strokeWidth={1.5} /><span className="hidden md:inline ml-1">{t.wishes.commitment.withdrawn}</span></>
                          ) : (
                            <><UserMinus className="h-3 w-3" strokeWidth={1.5} /><span className="hidden md:inline ml-1">{t.wishes.commitment.undecided}</span></>
                          )}
                        </Badge>
                      )}
                    </TableCell>
                    )}
                    {isColumnVisible('rosterDecision') && (
                    <TableCell className={cellPaddingClassName}>
                      {isEditing && canManageWishes ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <RosterDecisionToggle
                            value={editSelectionStatus}
                            onChange={onEditSelectionStatusChange}
                            disabled={isEditingLocked}
                            compact
                            className="w-full"
                          />
                        </div>
                      ) : canManageWishes && onSelectionStatusChange ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <RosterDecisionToggle
                            value={member.selectionStatus || 'undecided'}
                            onChange={(value) => onSelectionStatusChange(member.id, value)}
                            disabled={updatingSelectionMemberId === member.id}
                            compact
                            className="w-full"
                          />
                        </div>
                      ) : (
                        (() => {
                          const decisionBadge = getRosterDecisionBadge(member.selectionStatus);
                          const DecisionIcon = decisionBadge.icon;
                          return (
                            <Badge
                              variant="outline"
                              className={cn('px-2.5 py-0.5 text-[10px] md:text-xs whitespace-nowrap', decisionBadge.className)}
                            >
                              <DecisionIcon className="h-3 w-3" strokeWidth={1.5} />
                              <span className="hidden md:inline ml-1">{decisionBadge.label}</span>
                            </Badge>
                          );
                        })()
                      )}
                    </TableCell>
                    )}
                    {isColumnVisible('wishesCount') && (
                    <TableCell className="px-1 py-1 text-center">
                      <span className="text-sm text-muted-foreground">{member.wishes.filter(w => w.class_id).length}</span>
                    </TableCell>
                    )}
                    {isColumnVisible('wish1') && (
                    <TableCell className={cn(cellPaddingClassName, wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(0, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 1, !!member.isExternal)}
                    </TableCell>
                    )}
                    {isColumnVisible('wish2') && (
                    <TableCell className={cn(cellPaddingClassName, wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(1, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 2, !!member.isExternal)}
                    </TableCell>
                    )}
                    {isColumnVisible('wish3') && (
                    <TableCell className={cn(cellPaddingClassName, wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(2, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 3, !!member.isExternal)}
                    </TableCell>
                    )}
                    <TableCell className={cn(actionColumnClassName, 'px-1 py-1')}>
                      <div className="flex items-center justify-end gap-1">
                        {effectiveLocked && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex h-7 w-7 items-center justify-center text-warning">
                                  <Lock className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs max-w-[220px]">
                                {lockTooltip}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {isEditing && (
                          <>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <CosmicButton
                                    size="sm"
                                    variant="default"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSaveEditing();
                                    }}
                                    loading={saving}
                                    disabled={saving}
                                    aria-label={t.common.save}
                                    icon={saving ? undefined : <Save className="h-4 w-4" strokeWidth={1.5} />}
                                    className="!h-9 !max-h-9 !min-h-9 !w-9 !min-w-9 !max-w-9 !p-0"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="left">{t.common.save}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <CosmicButton
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCancelEditing();
                                    }}
                                    disabled={saving}
                                    aria-label={t.common.cancel}
                                    icon={<X className="h-4 w-4" strokeWidth={1.5} />}
                                    className="!h-9 !max-h-9 !min-h-9 !w-9 !min-w-9 !max-w-9 !p-0"
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="left">{t.common.cancel}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                        {!isEditing && rowActions.length <= 1 && rowActions.map((action) => (
                          <TooltipProvider key={action.key} delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CosmicButton
                                  size="sm"
                                  variant={action.key === 'edit' && isEditing ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick();
                                  }}
                                  loading={action.loading}
                                  disabled={action.disabled}
                                  icon={
                                    action.loading
                                      ? undefined
                                      : <action.icon className={action.key === 'edit' ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={1.5} />
                                  }
                                  className="!h-9 !max-h-9 !min-h-9 !w-9 !min-w-9 !max-w-9 !p-0"
                                />
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                {action.label}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {!isEditing && rowActions.length > 1 && (
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <CosmicButton
                                size="sm"
                                variant="outline"
                                onClick={(e) => e.stopPropagation()}
                                className="!h-9 !max-h-9 !min-h-9 !w-9 !min-w-9 !max-w-9 !p-0 flex-none"
                                aria-label={t.common.actions}
                                icon={<MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              {rowActions.map((action) => (
                                <DropdownMenuItem
                                  key={action.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!action.disabled && !action.loading) {
                                      action.onClick();
                                    }
                                  }}
                                  disabled={action.disabled || action.loading}
                                  className="cursor-pointer"
                                >
                                  {action.loading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <action.icon className="h-4 w-4 mr-2" />
                                  )}
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Additional wishes rows when editing - dynamic generation for up to 13 wishes */}
                  {isEditing && editWishes.length > 3 && (
                    <>
                      {Array.from({ length: Math.ceil((editWishes.length - 3) / 3) }).map((_, rowIdx) => {
                        const startIdx = 3 + rowIdx * 3;
                        const rowWishes = editWishes.slice(startIdx, startIdx + 3);
                        
                        return (
                          <TableRow key={`extra-${rowIdx}`} className="border-border/10 bg-primary/[0.03]">
                            <TableCell colSpan={leadingColSpan} className="px-1.5 py-1">
                              <span className="text-xs text-muted-foreground">
                                {t.dashboard.additionalWishes} ({startIdx + 1}-{Math.min(startIdx + 3, editWishes.length)})
                              </span>
                            </TableCell>
                            {(['wish1', 'wish2', 'wish3'] as const).map((columnId, idx) => (
                              isColumnVisible(columnId) ? (
                                <TableCell key={columnId} className={cn(cellPaddingClassName, wishColumnClassName)}>
                                  {rowWishes[idx] ? renderEditWishCell(startIdx + idx, editWishes.length > 1) : null}
                                </TableCell>
                              ) : null
                            ))}
                            <TableCell className="px-1 py-1" />
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Add wish button row when editing */}
                  {isEditing && editWishes.length < maxWishes && (
                    <TableRow className="border-border/10 bg-primary/[0.02]">
                      <TableCell colSpan={visibleDataColumnCount + 2} className="px-1.5 py-1">
                        <button
                          onClick={onAddWish}
                          disabled={isEditingLocked}
                          className={cn(
                            "flex items-center gap-1.5 text-xs transition-colors",
                            isEditingLocked ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t.dashboard.addWish}
                        </button>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </GlowCard>
  );
};
