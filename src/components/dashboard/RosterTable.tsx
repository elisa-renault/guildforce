import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataListSkeleton } from '@/components/ui/data-list-skeleton';
import { CheckCircle, HelpCircle, XCircle, Pencil, Save, Shield, Heart, Sword, Swords, Crosshair, MessageSquare, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Lock, Unlock, MoreVertical, Loader2, UserPlus, History } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { MemberWish, RosterSelectionStatus, WishData, WishChoice, ValidationStatus } from '@/types/guild';
import { InlineWishEditor } from './InlineWishEditor';
import { WishValidationBadge } from './WishValidationBadge';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { MobileRosterCard } from './MobileRosterCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortColumn = 'player' | 'status' | 'rosterDecision' | 'currentAssignment' | 'wish1' | 'wish2' | 'wish3' | 'wishesCount';
type SortDirection = 'asc' | 'desc';
export type RosterTableColumnId = 'status' | 'rosterDecision' | 'currentAssignment' | 'wishesCount' | 'wish1' | 'wish2' | 'wish3';

const defaultVisibleColumns: RosterTableColumnId[] = [
  'status',
  'rosterDecision',
  'currentAssignment',
  'wishesCount',
  'wish1',
  'wish2',
  'wish3',
];

interface RosterTableProps {
  members: MemberWish[];
  loading?: boolean;
  currentUserId: string | undefined;
  selectedRosterId?: string | null;
  selectedSeasonId?: string | null;
  editingUserId: string | null;
  editWishes: WishData[];
  editStatus: CommitmentStatus;
  saving: boolean;
  maxWishes: number;
  canManageWishes?: boolean;
  canManageAssignments?: boolean;
  isRosterLocked?: boolean;
  isEditingLocked?: boolean;
  onStartEditing: (member: MemberWish) => void;
  onUpdateEditWish: (
    index: number,
    field: keyof WishData,
    value: WishData[keyof WishData]
  ) => void;
  onEditStatusChange: (status: CommitmentStatus) => void;
  onSaveEditing: () => void;
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
  onEditAssignment?: (member: MemberWish) => void;
  onViewHistory?: (member: MemberWish) => void;
  updatingAssignmentMemberId?: string | null;
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
  currentUserId,
  selectedRosterId,
  selectedSeasonId,
  editingUserId,
  editWishes,
  editStatus,
  saving,
  maxWishes,
  canManageWishes = false,
  canManageAssignments = canManageWishes,
  isRosterLocked = false,
  isEditingLocked = false,
  onStartEditing,
  onUpdateEditWish,
  onEditStatusChange,
  onSaveEditing,
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
  onEditAssignment,
  onViewHistory,
  updatingAssignmentMemberId = null,
  onSortSummaryChange,
  visibleColumns = defaultVisibleColumns,
}: RosterTableProps) => {
  const wishColumnClassName = 'w-[210px] min-w-[210px]';
  const isColumnVisible = (column: RosterTableColumnId) => visibleColumns.includes(column);
  const visibleDataColumnCount = visibleColumns.length;
  const leadingColSpan = 1 + Number(isColumnVisible('status')) + Number(isColumnVisible('rosterDecision')) + Number(isColumnVisible('currentAssignment')) + Number(isColumnVisible('wishesCount'));
  const tableMinWidth = 160
    + (isColumnVisible('status') ? 118 : 0)
    + (isColumnVisible('rosterDecision') ? 160 : 0)
    + (isColumnVisible('currentAssignment') ? 160 : 0)
    + (isColumnVisible('wishesCount') ? 82 : 0)
    + (isColumnVisible('wish1') ? 210 : 0)
    + (isColumnVisible('wish2') ? 210 : 0)
    + (isColumnVisible('wish3') ? 210 : 0)
    + 48;
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const isMobile = useIsMobile();
  const [validatingWish, setValidatingWish] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('wishesCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const manualEntryHelp = language === 'fr'
    ? 'Ce personnage a été ajouté manuellement. L’icône disparaîtra une fois le personnage claim via Guildforce.'
    : 'This character was added manually. The icon will disappear once the character is claimed via Guildforce.';
  const rosterTableLabels = t.dashboard.rosterTable;
  const sortColumnLabels: Record<SortColumn, string> = {
    player: rosterTableLabels.player,
    status: rosterTableLabels.status,
    rosterDecision: rosterTableLabels.decision,
    currentAssignment: rosterTableLabels.assignment,
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
          className: 'bg-healer/20 text-healer border-healer/30',
        };
      case 'bench':
        return {
          label: t.wishes.rosterDecision.bench,
          className: 'bg-warning/20 text-warning border-warning/30',
        };
      case 'not_selected':
        return {
          label: t.wishes.rosterDecision.notSelected,
          className: 'bg-destructive/20 text-destructive border-destructive/30',
        };
      default:
        return {
          label: t.wishes.rosterDecision.undecided,
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

  const getAssignmentMainSpecId = (member: MemberWish): string | null => {
    const assignment = member.currentAssignment;
    if (!assignment?.class_id) return null;
    if (assignment.spec_id) return assignment.spec_id;

    const matchingWish = member.wishes.find((wish) => (
      wish.class_id === assignment.class_id
      && (
        assignment.choice_index === null
        || assignment.choice_index === undefined
        || wish.choice_index === assignment.choice_index
      )
    )) || member.wishes.find((wish) => wish.class_id === assignment.class_id);

    return matchingWish?.spec_ids?.[0] || null;
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
        case 'currentAssignment': {
          const assignmentA = a.currentAssignment?.class_id || '';
          const assignmentB = b.currentAssignment?.class_id || '';
          comparison = assignmentA.localeCompare(assignmentB);
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
          'group/header cursor-pointer select-none px-2 py-1.5 text-xs transition-colors',
          isActive
            ? 'bg-primary/5 text-foreground'
            : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
          className
        )}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1.5">
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
          <div className="h-6 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center gap-1">
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
          <div className="h-6 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center gap-1">
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
      <div className="flex min-w-0 flex-col gap-1.5">
        {/* Class with validation badge */}
        <div className="flex min-w-0 items-center gap-1.5">
          <div 
            className="h-7 min-w-0 flex-1 rounded-md flex items-center px-2 text-xs font-medium"
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
        <div className="min-h-6 w-full flex items-center gap-1.5 text-[10px] flex-wrap overflow-hidden">
          {specs.length > 0 ? (
            specs.map((spec) => {
              const config = roleConfig[spec.role];
              // Use dynamic icon for DPS based on range
              const Icon = spec.role === 'dps' 
                ? (spec.range === 'ranged' ? Crosshair : Swords)
                : config?.icon;
              return (
                <div key={spec.id} className="flex min-w-0 items-center gap-0.5">
                  {Icon && <Icon className={cn("h-3 w-3 flex-shrink-0", config?.color)} />}
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
                  <MessageSquare className="h-3 w-3 text-primary flex-shrink-0 cursor-help" />
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

  const renderCurrentAssignmentCell = (member: MemberWish) => {
    const assignment = member.currentAssignment;
    if (!assignment?.class_id) {
      return <span className="text-xs text-muted-foreground/60">—</span>;
    }

    const cls = getClassById(assignment.class_id);
    const spec = getAssignmentMainSpecId(member);
    const specDetails = spec ? getSpecById(spec) : null;
    const config = specDetails ? roleConfig[specDetails.role] : null;
    const Icon = specDetails?.role === 'dps'
      ? (specDetails.range === 'ranged' ? Crosshair : Swords)
      : config?.icon;

    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <div
          className={cn(
            'h-7 w-full rounded-md flex items-center px-2 text-xs font-medium',
            !cls && 'bg-muted/50 text-muted-foreground'
          )}
          style={cls ? {
            backgroundColor: `hsl(var(--class-${cls.id}) / 0.2)`,
            color: `hsl(var(--class-${cls.id}))`,
          } : undefined}
        >
          <span className="truncate">
            {cls ? getLocalizedClassName(cls.id, language) : assignment.class_id}
          </span>
        </div>

        <div className="min-h-6 w-full flex min-w-0 items-center gap-1 text-[10px]">
          {specDetails ? (
            <>
              {Icon && <Icon className={cn('h-3 w-3 flex-shrink-0', config?.color)} />}
              <span className="truncate text-muted-foreground">{getLocalizedSpecName(specDetails.id, language)}</span>
            </>
          ) : spec ? (
            <span className="truncate text-muted-foreground">{spec}</span>
          ) : (
            <span className="text-muted-foreground/50">—</span>
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

  if (loading) {
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
              navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/wishes${qp}${seasonParam}`);
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
              canManageAssignments={canManageAssignments}
              onEditAssignment={onEditAssignment}
              onViewHistory={onViewHistory}
              updatingAssignmentMemberId={updatingAssignmentMemberId}
            />
          );
        })}
      </div>
    );
  }
  // Desktop view - table layout
  return (
    <GlowCard surface="section" className="overflow-hidden p-0">
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
              {isColumnVisible('currentAssignment') && (
                <SortableHeader column="currentAssignment" className="w-[160px]" tooltip={rosterTableLabels.assignmentTooltip}>
                  {rosterTableLabels.assignment}
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
              <TableHead className="w-[48px] px-1 py-1.5 text-xs text-muted-foreground"></TableHead>
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

              const rowActions = [
                ...(canManageAssignments && onViewHistory && member.seasonMemberId ? [{
                  key: 'history',
                  label: language === 'fr' ? 'Historique' : 'History',
                  icon: History,
                  onClick: () => onViewHistory(member),
                  loading: false,
                  disabled: false,
                }] : []),
                ...(canManageWishes && onRemoveMember && !isOwnRow ? [{
                  key: 'delete',
                  label: language === 'fr' ? 'Retirer' : 'Remove',
                  icon: Trash2,
                  onClick: () => onRemoveMember(member.id),
                  loading: deletingMemberId === member.id,
                  disabled: false,
                }] : []),
                ...(canManageWishes && onToggleMemberLock && !member.isExternal ? [{
                  key: 'lock',
                  label: memberLocked
                    ? (language === 'fr' ? 'Déverrouiller' : 'Unlock')
                    : (language === 'fr' ? 'Verrouiller' : 'Lock'),
                  icon: memberLocked ? Unlock : Lock,
                  onClick: () => onToggleMemberLock(member.id, !memberLocked),
                  loading: lockingMemberId === member.id,
                  disabled: false,
                }] : []),
                ...((isOwnRow || canManageWishes || (canManageAssignments && onEditAssignment && member.seasonMemberId)) ? [{
                  key: 'edit',
                  label: isEditing ? t.common.save : t.common.edit,
                  icon: isEditing ? Save : Pencil,
                  onClick: () => {
                    if (isEditing) {
                      onSaveEditing();
                    } else {
                      onStartEditing(member);
                    }
                  },
                  loading: (isEditing && saving) || updatingAssignmentMemberId === member.id,
                  disabled: !(canManageAssignments && onEditAssignment && member.seasonMemberId) && isEditingLocked,
                }] : []),
              ];
              
              const canOpenAssignmentEditor = Boolean(
                isEditing
                && canManageAssignments
                && onEditAssignment
                && member.seasonMemberId
              );
              const playerSubtitle = member.currentAssignment?.character_name_snapshot || member.mainCharacterName;

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
                    <TableCell className="px-2 py-1.5 text-sm font-medium text-foreground">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="min-w-0 truncate">{member.username}</span>
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
                          <div className="text-[11px] text-muted-foreground truncate">
                            <span className="text-foreground/80">{playerSubtitle}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isColumnVisible('status') && (
                    <TableCell className="px-1.5 py-1.5">
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
                          variant={member.status === 'confirmed' ? 'default' : 'outline'}
                          className={cn(
                            "text-[10px] md:text-xs px-2 py-0.5 whitespace-nowrap",
                            member.status === 'confirmed' 
                              ? 'bg-healer/20 text-healer border-healer/30' 
                              : member.status === 'withdrawn'
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-warning/20 text-warning border-warning/30'
                          )}
                        >
                          {member.status === 'confirmed' ? (
                            <><CheckCircle className="h-3 w-3" strokeWidth={1.5} /><span className="hidden md:inline ml-1">{t.wishes.commitment.confirmed}</span></>
                          ) : member.status === 'withdrawn' ? (
                            <><XCircle className="h-3 w-3" strokeWidth={1.5} /><span className="hidden md:inline ml-1">{t.wishes.commitment.withdrawn}</span></>
                          ) : (
                            <><HelpCircle className="h-3 w-3" strokeWidth={1.5} /><span className="hidden md:inline ml-1">{t.wishes.commitment.undecided}</span></>
                          )}
                        </Badge>
                      )}
                    </TableCell>
                    )}
                    {isColumnVisible('rosterDecision') && (
                    <TableCell className="px-1.5 py-1.5">
                      {canManageWishes && onSelectionStatusChange ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={member.selectionStatus || 'undecided'}
                            onValueChange={(value) => onSelectionStatusChange(member.id, value as RosterSelectionStatus)}
                            disabled={updatingSelectionMemberId === member.id}
                          >
                            <SelectTrigger
                              className="h-7 w-full min-w-0 text-[10px] md:text-xs px-1.5"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="undecided">{t.wishes.rosterDecision.undecided}</SelectItem>
                            <SelectItem value="selected">{t.wishes.rosterDecision.selected}</SelectItem>
                            <SelectItem value="bench">{t.wishes.rosterDecision.bench}</SelectItem>
                            <SelectItem value="not_selected">{t.wishes.rosterDecision.notSelected}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] md:text-xs px-2 py-0.5 whitespace-nowrap', getRosterDecisionBadge(member.selectionStatus).className)}
                        >
                          {getRosterDecisionBadge(member.selectionStatus).label}
                        </Badge>
                      )}
                    </TableCell>
                    )}
                    {isColumnVisible('currentAssignment') && (
                    <TableCell className="px-1.5 py-1.5">
                      {canOpenAssignmentEditor ? (
                        <button
                          type="button"
                          className="w-full rounded-md text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditAssignment?.(member);
                          }}
                          disabled={updatingAssignmentMemberId === member.id}
                        >
                          {renderCurrentAssignmentCell(member)}
                        </button>
                      ) : (
                        renderCurrentAssignmentCell(member)
                      )}
                    </TableCell>
                    )}
                    {isColumnVisible('wishesCount') && (
                    <TableCell className="px-1 py-1.5 text-center">
                      <span className="text-sm text-muted-foreground">{member.wishes.filter(w => w.class_id).length}</span>
                    </TableCell>
                    )}
                    {isColumnVisible('wish1') && (
                    <TableCell className={cn("px-1.5 py-1.5", wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(0, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 1, !!member.isExternal)}
                    </TableCell>
                    )}
                    {isColumnVisible('wish2') && (
                    <TableCell className={cn("px-1.5 py-1.5", wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(1, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 2, !!member.isExternal)}
                    </TableCell>
                    )}
                    {isColumnVisible('wish3') && (
                    <TableCell className={cn("px-1.5 py-1.5", wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(2, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 3, !!member.isExternal)}
                    </TableCell>
                    )}
                    <TableCell className="px-1 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        {effectiveLocked && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex h-8 w-8 items-center justify-center text-warning">
                                  <Lock className="h-3.5 w-3.5" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs max-w-[220px]">
                                {lockTooltip}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {rowActions.length <= 1 && rowActions.map((action) => (
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
                                  className="h-8 px-2"
                                />
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                {action.label}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                        {rowActions.length > 1 && (
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <CosmicButton
                                size="sm"
                                variant="outline"
                                onClick={(e) => e.stopPropagation()}
                                className="!h-8 !max-h-8 !min-h-8 !w-8 !min-w-8 !max-w-8 !p-0 flex-none"
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
                            <TableCell colSpan={leadingColSpan} className="px-2 py-1.5">
                              <span className="text-xs text-muted-foreground">
                                {t.dashboard.additionalWishes} ({startIdx + 1}-{Math.min(startIdx + 3, editWishes.length)})
                              </span>
                            </TableCell>
                            {(['wish1', 'wish2', 'wish3'] as const).map((columnId, idx) => (
                              isColumnVisible(columnId) ? (
                                <TableCell key={columnId} className={cn("px-2 py-1.5", wishColumnClassName)}>
                                  {rowWishes[idx] ? renderEditWishCell(startIdx + idx, editWishes.length > 1) : null}
                                </TableCell>
                              ) : null
                            ))}
                            <TableCell className="px-2 py-1.5" />
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Add wish button row when editing */}
                  {isEditing && editWishes.length < maxWishes && (
                    <TableRow className="border-border/10 bg-primary/[0.02]">
                      <TableCell colSpan={visibleDataColumnCount + 2} className="px-2 py-1.5">
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
