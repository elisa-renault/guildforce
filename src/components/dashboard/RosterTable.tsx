import { Fragment, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, HelpCircle, XCircle, Pencil, Save, Shield, Heart, Sword, Swords, Crosshair, MessageSquare, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Lock, Unlock, MoreVertical, Loader2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { MemberWish, RosterSelectionStatus, WishData, WishChoice, ValidationStatus } from '@/types/guild';
import { InlineWishEditor } from './InlineWishEditor';
import { WishValidationBadge } from './WishValidationBadge';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { MobileRosterCard } from './MobileRosterCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortColumn = 'player' | 'status' | 'rosterDecision' | 'wish1' | 'wish2' | 'wish3' | 'wishesCount';
type SortDirection = 'asc' | 'desc';

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
}: RosterTableProps) => {
  const wishColumnClassName = 'w-[260px] min-w-[260px] xl:w-[280px] xl:min-w-[280px]';
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const isMobile = useIsMobile();
  const [validatingWish, setValidatingWish] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>('wishesCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const manualEntryHelp = language === 'fr'
    ? 'Ce personnage a été ajouté manuellement. L’icône disparaîtra une fois le personnage claim via Guildforce.'
    : 'This character was added manually. The icon will disappear once the character is claimed via Guildforce.';

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
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const SortableHeader = ({ column, children, className }: { column: SortColumn; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={cn("text-muted-foreground text-xs py-2 px-2 md:px-3 cursor-pointer hover:text-foreground transition-colors select-none", className)}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon column={column} />
      </div>
    </TableHead>
  );

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
      <div className="flex flex-col gap-1.5">
        {/* Class with validation badge */}
        <div className="flex items-center gap-1.5">
          <div 
            className="h-7 flex-1 rounded-md flex items-center px-2 text-xs font-medium"
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
        <div className="min-h-6 w-full flex items-center gap-2 text-[10px] flex-wrap">
          {specs.length > 0 ? (
            specs.map((spec) => {
              const config = roleConfig[spec.role];
              // Use dynamic icon for DPS based on range
              const Icon = spec.role === 'dps' 
                ? (spec.range === 'ranged' ? Crosshair : Swords)
                : config?.icon;
              return (
                <div key={spec.id} className="flex items-center gap-0.5">
                  {Icon && <Icon className={cn("h-3 w-3 flex-shrink-0", config?.color)} />}
                  <span className="text-muted-foreground">{getLocalizedSpecName(spec.id, language)}</span>
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

  // Count extra wishes beyond 3 for display indicator
  const getExtraWishesCount = (wishes: WishChoice[]) => {
    const filledWishes = wishes.filter(w => w.class_id);
    return Math.max(0, filledWishes.length - 3);
  };

  if (loading) {
    return (
      <GlowCard className="overflow-hidden">
        <div
          className="space-y-4 p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{t.common.loading}</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: isMobile ? 3 : 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-36 flex-shrink-0" />
                <Skeleton className="h-8 w-28 flex-shrink-0" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="hidden h-8 flex-1 md:block" />
                <Skeleton className="hidden h-8 flex-1 lg:block" />
              </div>
            ))}
          </div>
        </div>
      </GlowCard>
    );
  }

  if (members.length === 0) {
    return (
      <GlowCard className="overflow-hidden">
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
            />
          );
        })}
      </div>
    );
  }
  // Desktop view - table layout
  return (
    <GlowCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="table-auto min-w-[1400px]">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <SortableHeader column="player" className="w-[180px] md:w-[240px]">{t.dashboard.player}</SortableHeader>
              <SortableHeader column="status" className="w-[120px] md:w-[150px]">{t.wishes.status}</SortableHeader>
              <SortableHeader column="rosterDecision" className="w-[160px] md:w-[200px]">{t.wishes.rosterDecision.title}</SortableHeader>
              <SortableHeader column="wishesCount" className="w-[80px] md:w-[90px]"><span className="hidden md:inline">{t.dashboard.wishesCount}</span><span className="md:hidden">#</span></SortableHeader>
              <SortableHeader column="wish1" className={wishColumnClassName}><span className="hidden md:inline">{t.dashboard.firstChoice}</span><span className="md:hidden">#1</span></SortableHeader>
              <SortableHeader column="wish2" className={wishColumnClassName}><span className="hidden md:inline">{t.dashboard.secondChoice}</span><span className="md:hidden">#2</span></SortableHeader>
              <SortableHeader column="wish3" className={wishColumnClassName}><span className="hidden md:inline">{t.dashboard.thirdChoice}</span><span className="md:hidden">#3</span></SortableHeader>
              <TableHead className="text-muted-foreground text-xs py-2 px-0 w-[72px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => {
              const isOwnRow = member.id === currentUserId;
              const isEditing = editingUserId === member.id;
              const extraWishes = getExtraWishesCount(member.wishes);
              const memberLocked = Boolean(member.wishes_locked);
              const effectiveLocked = isRosterLocked || memberLocked;
              const lockTooltip = isRosterLocked
                ? t.wishes.lockedRosterDesc
                : memberLocked
                  ? t.wishes.lockedMemberDesc
                  : '';

              const rowActions = [
                ...(canManageWishes && onRemoveMember && !isOwnRow ? [{
                  key: 'delete',
                  label: t.common.delete,
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
                ...((isOwnRow || canManageWishes) ? [{
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
                  loading: isEditing && saving,
                  disabled: isEditingLocked,
                }] : []),
              ];
              
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
                    <TableCell className="font-medium text-foreground text-sm py-2 px-2 md:px-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{member.username}</span>
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
                          {effectiveLocked && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[220px]">
                                  {lockTooltip}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {!isEditing && extraWishes > 0 && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground border-muted-foreground/30 flex-shrink-0">
                                    +{extraWishes}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {extraWishes + 3} {s('dashboard.roster_table.total_wishes_suffix')}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {member.mainCharacterName && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            <span className="text-foreground/80">{member.mainCharacterName}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-2 md:px-3">
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
                    <TableCell className="py-2 px-2 md:px-3">
                      {canManageWishes && onSelectionStatusChange ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={member.selectionStatus || 'undecided'}
                            onValueChange={(value) => onSelectionStatusChange(member.id, value as RosterSelectionStatus)}
                            disabled={updatingSelectionMemberId === member.id}
                          >
                            <SelectTrigger
                              className="h-7 min-w-[140px] md:min-w-[170px] text-[10px] md:text-xs px-1.5"
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
                    <TableCell className="py-2 px-2 md:px-3 text-center">
                      <span className="text-sm text-muted-foreground">{member.wishes.filter(w => w.class_id).length}</span>
                    </TableCell>
                    <TableCell className={cn("py-2 px-2 md:px-3", wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(0, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 1, !!member.isExternal)}
                    </TableCell>
                    <TableCell className={cn("py-2 px-2 md:px-3", wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(1, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 2, !!member.isExternal)}
                    </TableCell>
                    <TableCell className={cn("py-2 px-2 md:px-3", wishColumnClassName)}>
                      {isEditing ? renderEditWishCell(2, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 3, !!member.isExternal)}
                    </TableCell>
                    <TableCell className="py-1 pl-0 pr-1">
                      <div className="flex justify-end gap-1">
                        {rowActions.length <= 1 && rowActions.map((action) => (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip key={action.key}>
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
                                icon={<MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
                                className="h-8 w-8 p-0"
                                aria-label={t.common.actions}
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
                            {/* colSpan=4 covers: Player + Status + Roster decision + WishesCount */}
                            <TableCell colSpan={4} className="py-2 px-2 md:px-3">
                              <span className="text-xs text-muted-foreground">
                                {t.dashboard.additionalWishes} ({startIdx + 1}-{Math.min(startIdx + 3, editWishes.length)})
                              </span>
                            </TableCell>
                            {rowWishes.map((_, idx) => (
                              <TableCell key={startIdx + idx} className={cn("py-2 px-2 md:px-3", wishColumnClassName)}>
                                {renderEditWishCell(startIdx + idx, editWishes.length > 1)}
                              </TableCell>
                            ))}
                            {/* Empty cells to maintain table alignment */}
                            {Array.from({ length: 3 - rowWishes.length }).map((_, i) => (
                              <TableCell key={`empty-${i}`} className={cn("py-2 px-2 md:px-3", wishColumnClassName)} />
                            ))}
                            <TableCell className="py-2 px-2 md:px-3" />
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Add wish button row when editing */}
                  {isEditing && editWishes.length < maxWishes && (
                    <TableRow className="border-border/10 bg-primary/[0.02]">
                      <TableCell colSpan={8} className="py-2 px-2 md:px-3">
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
