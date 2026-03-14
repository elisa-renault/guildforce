import { Badge } from '@/components/ui/badge';
import { CosmicButton } from '@/components/CosmicButton';
import { CheckCircle, HelpCircle, XCircle, Pencil, Shield, Heart, Sword, Swords, Crosshair, MessageSquare, Lock, Unlock, MoreVertical, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getSpecById } from '@/data/wowClasses';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MobileRosterCardProps {
  member: MemberWish;
  isOwnRow: boolean;
  canManageWishes: boolean;
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

  const renderWishBadge = (wish: WishChoice) => {
    const cls = getClassById(wish.class_id);
    if (!cls) return null;

    const specs = wish.spec_ids.map(id => getSpecById(id)).filter(Boolean);
    const validationStatus = wish.validation_status || 'pending';

    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="text-xs text-muted-foreground w-4">#{wish.choice_index}</span>
        <div 
          className="flex-1 flex items-center gap-2 px-2 py-1 rounded text-xs"
          style={{ 
            backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
            color: `hsl(var(--class-${cls.id}))`
          }}
        >
          <span className="font-medium truncate">{getLocalizedClassName(cls.id, language)}</span>
          {specs.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              {specs.slice(0, 2).map((spec) => {
                const config = roleConfig[spec.role];
                const Icon = spec.role === 'dps' 
                  ? (spec.range === 'ranged' ? Crosshair : Swords)
                  : config?.icon;
                return Icon ? <Icon key={spec.id} className={cn("h-3 w-3", config?.color)} /> : null;
              })}
              {specs.length > 2 && <span className="text-[10px]">+{specs.length - 2}</span>}
            </div>
          )}
          {wish.comment && <MessageSquare className="h-3 w-3 text-primary flex-shrink-0" />}
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
    );
  };

  const filledWishes = member.wishes.filter(w => w.class_id);
  const memberLocked = Boolean(member.wishes_locked);
  const effectiveLocked = isRosterLocked || memberLocked;
  const actionItems = [
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
      label: t.common.edit,
      icon: Pencil,
      onClick: () => onStartEditing(member),
      loading: false,
      disabled: effectiveLocked,
    }] : []),
  ];

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    onClick();
  };

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isOwnRow 
          ? "bg-primary/5 border-primary/30" 
          : "bg-card/50 border-border/30 hover:border-border/50",
        "cursor-pointer"
      )}
      onClick={handleCardClick}
    >
      {/* Header with name and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{member.username}</span>
            {member.isExternal && (
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-primary/40 text-primary bg-primary/10"
                title={manualEntryLabel}
                aria-label={manualEntryLabel}
              >
                <UserPlus className="h-3 w-3" />
              </span>
            )}
            {effectiveLocked && <Lock className="h-3.5 w-3.5 text-warning" />}
            <Badge 
              variant={member.status === 'confirmed' ? 'default' : 'outline'}
              className={cn(
                "text-[10px] px-1.5 py-0",
                member.status === 'confirmed' 
                  ? 'bg-healer/20 text-healer border-healer/30' 
                  : member.status === 'withdrawn'
                  ? 'bg-destructive/20 text-destructive border-destructive/30'
                  : 'bg-warning/20 text-warning border-warning/30'
              )}
            >
              {member.status === 'confirmed' ? (
                <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
              ) : member.status === 'withdrawn' ? (
                <XCircle className="h-3 w-3" strokeWidth={1.5} />
              ) : (
                <HelpCircle className="h-3 w-3" strokeWidth={1.5} />
              )}
            </Badge>
          </div>
          {member.mainCharacterName && (
            <div className="text-[11px] text-muted-foreground">
              <span className="text-foreground/80">{member.mainCharacterName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {actionItems.length <= 1 && actionItems.map((action) => (
            <CosmicButton
              key={action.key}
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              loading={action.loading}
              disabled={action.disabled}
              icon={<action.icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
              className="h-7 w-7 p-0"
              aria-label={action.label}
            />
          ))}
          {actionItems.length > 1 && (
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
              <DropdownMenuContent align="end" className="bg-card border-border">
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
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.wishes.rosterDecision.title}</span>
        {canManageWishes && onSelectionStatusChange ? (
          <Select
            value={member.selectionStatus || 'undecided'}
            onValueChange={(value) => onSelectionStatusChange(member.id, value as RosterSelectionStatus)}
            disabled={updatingSelectionMemberId === member.id}
          >
            <SelectTrigger className="h-7 text-[10px] px-1.5 min-w-[140px]">
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
            className={cn('text-[10px] px-1.5 py-0', getRosterDecisionBadge(member.selectionStatus).className)}
          >
            {getRosterDecisionBadge(member.selectionStatus).label}
          </Badge>
        )}
      </div>

      {/* Wishes list */}
      <div className="space-y-0.5">
        {filledWishes.length > 0 ? (
          filledWishes.slice(0, 3).map((wish) => (
            <div key={wish.choice_index} onClick={(e) => e.stopPropagation()}>
              {renderWishBadge(wish)}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground/50 py-2">
            {t.wishes.noWishes}
          </div>
        )}
        {filledWishes.length > 3 && (
          <div className="text-xs text-muted-foreground pt-1">
            +{filledWishes.length - 3} {t.wishes.specs}
          </div>
        )}
      </div>

    </div>
  );
};
