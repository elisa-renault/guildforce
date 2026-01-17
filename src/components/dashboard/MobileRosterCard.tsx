import { Badge } from '@/components/ui/badge';
import { CosmicButton } from '@/components/CosmicButton';
import { CheckCircle, HelpCircle, XCircle, Pencil, Shield, Heart, Swords, Crosshair, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getSpecById } from '@/data/wowClasses';
import { MemberWish, WishChoice, ValidationStatus } from '@/types/guild';
import { WishValidationBadge } from './WishValidationBadge';
import { cn } from '@/lib/utils';

interface MobileRosterCardProps {
  member: MemberWish;
  isOwnRow: boolean;
  isGM: boolean;
  onStartEditing: (member: MemberWish) => void;
  onValidateWish?: (userId: string, choiceIndex: number, status: ValidationStatus) => void;
  onClick: () => void;
}

const roleConfig: Record<string, { icon: typeof Shield; color: string }> = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  dps: { icon: Swords, color: 'text-dps' },
};

export const MobileRosterCard = ({
  member,
  isOwnRow,
  isGM,
  onStartEditing,
  onValidateWish,
  onClick,
}: MobileRosterCardProps) => {
  const { t, language } = useLanguage();

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
          <span className="font-medium truncate">{cls.name[language]}</span>
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
          isGM={isGM}
          onValidate={(status) => onValidateWish?.(member.id, wish.choice_index, status)}
          compact
        />
      </div>
    );
  };

  const filledWishes = member.wishes.filter(w => w.class_id);

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isOwnRow 
          ? "bg-primary/5 border-primary/30" 
          : "bg-card/50 border-border/30 hover:border-border/50",
        "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Header with name and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{member.username}</span>
          <Badge 
            variant={member.status === 'confirmed' ? 'default' : 'outline'}
            className={cn(
              "text-[10px] px-1.5 py-0",
              member.status === 'confirmed' 
                ? 'bg-healer/20 text-healer border-healer/30' 
                : member.status === 'withdrawn'
                ? 'bg-destructive/20 text-destructive border-destructive/30'
                : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
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
        {isOwnRow && (
          <CosmicButton 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              onStartEditing(member);
            }}
            icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
            className="h-7 w-7 p-0"
          >
            <span className="sr-only">{t.common.edit}</span>
          </CosmicButton>
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
            {language === 'fr' ? 'Aucun vœu' : 'No wishes'}
          </div>
        )}
        {filledWishes.length > 3 && (
          <div className="text-xs text-muted-foreground pt-1">
            +{filledWishes.length - 3} {language === 'fr' ? 'vœux' : 'wishes'}
          </div>
        )}
      </div>
    </div>
  );
};