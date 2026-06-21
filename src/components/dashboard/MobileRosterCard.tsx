import { Badge } from '@/components/ui/badge';
import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { CheckCircle, HelpCircle, XCircle, Pencil, Shield, Heart, Sword, Swords, Crosshair, MessageSquare, Lock, Unlock, MoreVertical, Loader2, Trash2, UserPlus, History } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { MemberWish, RosterSelectionStatus, WishChoice, ValidationStatus } from '@/types/guild';
import { WishValidationBadge } from './WishValidationBadge';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MobileRosterCardProps {
  member: MemberWish;
  isOwnRow: boolean;
  canManageWishes: boolean;
  canManageAssignments?: boolean;
  isRosterLocked?: boolean;
  onStartEditing: (member: MemberWish) => void;
  onValidateWish?: (userId: string, choiceIndex: number, status: ValidationStatus) => void;
  onClick: () => void;
  onToggleMemberLock?: (memberId: string, locked: boolean) => void;
  lockingMemberId?: string | null;
  onRemoveMember?: (memberId: string) => void;
  deletingMemberId?: string | null;
  onSelectionStatusChange?: (memberId: string, status: RosterSelectionStatus) => void;
  updatingSelectionMemberId?: string | null;
  onEditAssignment?: (member: MemberWish) => void;
  onViewHistory?: (member: MemberWish) => void;
  updatingAssignmentMemberId?: string | null;
}

const roleConfig: Record<string, { icon: typeof Shield; color: string }> = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  dps: { icon: Sword, color: 'text-dps' },
};

export const MobileRosterCard = ({
  member,
  isOwnRow,
  canManageWishes,
  canManageAssignments = canManageWishes,
  isRosterLocked = false,
  onStartEditing,
  onValidateWish,
  onClick,
  onToggleMemberLock,
  lockingMemberId = null,
  onRemoveMember,
  deletingMemberId = null,
  onSelectionStatusChange,
  updatingSelectionMemberId = null,
  onEditAssignment,
  onViewHistory,
  updatingAssignmentMemberId = null,
}: MobileRosterCardProps) => {
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const manualEntryLabel = s('roster_wishes.manual_entry_label');

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

  const renderPrimaryWish = (wish: WishChoice) => {
    const cls = getClassById(wish.class_id);
    if (!cls) return null;

    const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean);
    const validationStatus = wish.validation_status || 'pending';

    return (
      <div className="rounded-md border border-border/40 bg-background/40 px-2.5 py-2">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="h-5 border-border/40 px-1.5 text-[10px] text-muted-foreground">
            #{wish.choice_index}
          </Badge>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 min-w-0 flex-1 items-center rounded-md px-2 text-xs font-medium"
                style={{
                  backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
                  color: `hsl(var(--class-${cls.id}))`,
                }}
              >
                <span className="truncate">{getLocalizedClassName(cls.id, language)}</span>
              </div>
              <WishValidationBadge
                status={validationStatus}
                validatedBy={wish.validated_by_username}
                validatedAt={wish.validated_at}
                isGM={canManageWishes && !member.isExternal}
                onValidate={(status) => onValidateWish?.(member.id, wish.choice_index, status)}
                compact
              />
            </div>
            <div className="flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
              {specs.length > 0 ? (
                specs.slice(0, 2).map((spec) => {
                  const config = roleConfig[spec.role];
                  const Icon = spec.role === 'dps'
                    ? (spec.range === 'ranged' ? Crosshair : Swords)
                    : config?.icon;
                  return (
                    <div key={spec.id} className="flex items-center gap-0.5">
                      {Icon ? <Icon className={cn('h-3 w-3', config?.color)} /> : null}
                      <span className="truncate">{getLocalizedSpecName(spec.id, language)}</span>
                    </div>
                  );
                })
              ) : (
                <span className="text-muted-foreground/50">-</span>
              )}
              {specs.length > 2 && <span>+{specs.length - 2}</span>}
              {wish.comment && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      aria-label={t.wishes.comment}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="top"
                    className="w-[min(18rem,calc(100vw-2rem))] border-border bg-card p-3 text-xs leading-relaxed text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">{t.wishes.comment}</div>
                    <p className="whitespace-pre-wrap break-words">{wish.comment}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filledWishes = member.wishes.filter(w => w.class_id);
  const primaryWish = filledWishes[0];
  const extraWishesCount = Math.max(filledWishes.length - 1, 0);
  const memberLocked = Boolean(member.wishes_locked);
  const effectiveLocked = isRosterLocked || memberLocked;
  const actionItems = [
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
      label: t.common.edit,
      icon: Pencil,
      onClick: () => {
        if (canManageAssignments && onEditAssignment && member.seasonMemberId) {
          onEditAssignment(member);
          return;
        }
        onStartEditing(member);
      },
      loading: updatingAssignmentMemberId === member.id,
      disabled: !(canManageAssignments && onEditAssignment && member.seasonMemberId) && effectiveLocked,
    }] : []),
  ];
  const statusBadge = (
    <Badge
      variant={member.status === 'confirmed' ? 'default' : 'outline'}
      className={cn(
        'h-7 shrink-0 px-2 text-[10px]',
        member.status === 'confirmed'
          ? 'bg-healer/20 text-healer border-healer/30'
          : member.status === 'withdrawn'
            ? 'bg-destructive/20 text-destructive border-destructive/30'
            : 'bg-warning/20 text-warning border-warning/30'
      )}
    >
      {member.status === 'confirmed' ? (
        <CheckCircle className="mr-1 h-3 w-3" strokeWidth={1.5} />
      ) : member.status === 'withdrawn' ? (
        <XCircle className="mr-1 h-3 w-3" strokeWidth={1.5} />
      ) : (
        <HelpCircle className="mr-1 h-3 w-3" strokeWidth={1.5} />
      )}
      {member.status === 'confirmed'
        ? t.wishes.commitment.confirmed
        : member.status === 'withdrawn'
          ? t.wishes.commitment.withdrawn
          : t.wishes.commitment.undecided}
    </Badge>
  );

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    onClick();
  };

  return (
    <GlowCard
      surface="section"
      className={cn(
        'p-2.5 transition-colors',
        isOwnRow ? 'bg-primary/[0.04] border-primary/30' : 'hover:border-border/50',
        'cursor-pointer'
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-shrink truncate text-sm font-medium text-foreground">{member.username}</span>
            {member.mainCharacterName && (
              <span className="max-w-[42%] shrink-0 truncate text-[11px] text-muted-foreground">
                {member.mainCharacterName}
              </span>
            )}
            {member.isExternal && (
              <span
                className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary"
                title={manualEntryLabel}
                aria-label={manualEntryLabel}
              >
                <UserPlus className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
          {extraWishesCount > 0 && (
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <Badge variant="outline" className="h-5 shrink-0 border-border/40 px-1.5 text-[10px] text-muted-foreground">
                +{extraWishesCount}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {effectiveLocked && <Lock className="h-3.5 w-3.5 text-warning" />}
          {actionItems.length > 0 && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <CosmicButton
                  size="sm"
                  variant="outline"
                  onClick={(e) => e.stopPropagation()}
                  icon={<MoreVertical className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  className="h-7 w-7 p-0"
                  aria-label={t.common.actions}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-border bg-card">
                {actionItems.map((action) => (
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <action.icon className="mr-2 h-4 w-4" />
                    )}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {statusBadge}
        {canManageWishes && onSelectionStatusChange ? (
          <Select
            value={member.selectionStatus || 'undecided'}
            onValueChange={(value) => onSelectionStatusChange(member.id, value as RosterSelectionStatus)}
            disabled={updatingSelectionMemberId === member.id}
          >
            <SelectTrigger className="h-7 min-w-0 flex-1 border-border/50 bg-background/60 px-2.5 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="undecided">{t.wishes.rosterDecision.undecided}</SelectItem>
              <SelectItem value="selected">{t.wishes.rosterDecision.selected}</SelectItem>
              <SelectItem value="bench">{t.wishes.rosterDecision.bench}</SelectItem>
              <SelectItem value="not_selected">{t.wishes.rosterDecision.notSelected}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge
            variant="outline"
            className={cn('h-7 min-w-0 px-2 text-[10px]', getRosterDecisionBadge(member.selectionStatus).className)}
          >
            {getRosterDecisionBadge(member.selectionStatus).label}
          </Badge>
        )}
      </div>

      <div className="mt-1.5">
        {primaryWish ? (
          <div onClick={(e) => e.stopPropagation()}>
            {renderPrimaryWish(primaryWish)}
            {extraWishesCount > 0 && (
              <div className="mt-1 px-1 text-[11px] text-muted-foreground">
                +{extraWishesCount} {s('dashboard.roster_table.total_wishes_suffix')}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border/40 px-2.5 py-2 text-xs text-muted-foreground/60">
            {t.wishes.noWishes}
          </div>
        )}
      </div>
    </GlowCard>
  );
};
