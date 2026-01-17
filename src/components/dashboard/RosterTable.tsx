import { Fragment, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, HelpCircle, XCircle, Pencil, X, Save, Shield, Heart, Swords, Crosshair, MessageSquare, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getSpecById } from '@/data/wowClasses';
import { MemberWish, WishData, WishChoice, ValidationStatus } from '@/types/guild';
import { InlineWishEditor } from './InlineWishEditor';
import { WishValidationBadge } from './WishValidationBadge';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { MobileRosterCard } from './MobileRosterCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type SortColumn = 'player' | 'status' | 'wish1' | 'wish2' | 'wish3';
type SortDirection = 'asc' | 'desc';

interface RosterTableProps {
  members: MemberWish[];
  currentUserId: string | undefined;
  selectedRosterId?: string | null;
  expandedRows: Set<string>;
  editingUserId: string | null;
  editWishes: WishData[];
  editStatus: CommitmentStatus;
  saving: boolean;
  maxWishes: number;
  isGM?: boolean;
  onToggleRow: (memberId: string) => void;
  onStartEditing: (member: MemberWish) => void;
  onCancelEditing: () => void;
  onUpdateEditWish: (index: number, field: keyof WishData, value: any) => void;
  onEditStatusChange: (status: CommitmentStatus) => void;
  onSaveEditing: () => void;
  onAddWish: () => void;
  onRemoveWish: (index: number) => void;
  onClearWish: (index: number) => void;
  onValidateWish?: (userId: string, choiceIndex: number, status: ValidationStatus) => void;
}

// Role config for icons
const roleConfig: Record<string, { icon: typeof Shield; color: string }> = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  dps: { icon: Swords, color: 'text-dps' },
};

export const RosterTable = ({
  members,
  currentUserId,
  selectedRosterId,
  editingUserId,
  editWishes,
  editStatus,
  saving,
  maxWishes,
  isGM = false,
  onStartEditing,
  onCancelEditing,
  onUpdateEditWish,
  onEditStatusChange,
  onSaveEditing,
  onAddWish,
  onRemoveWish,
  onClearWish,
  onValidateWish,
}: RosterTableProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const isMobile = useIsMobile();
  const [validatingWish, setValidatingWish] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
    return cls ? cls.name[language].toLowerCase() : '';
  };

  // Sort members
  const sortedMembers = useMemo(() => {
    if (!sortColumn) return members;

    return [...members].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'player':
          comparison = a.username.toLowerCase().localeCompare(b.username.toLowerCase());
          break;
        case 'status':
          const statusOrder = { confirmed: 0, potential: 1, withdrawn: 2 };
          comparison = (statusOrder[a.status as keyof typeof statusOrder] ?? 1) - (statusOrder[b.status as keyof typeof statusOrder] ?? 1);
          break;
        case 'wish1':
          comparison = getWishClassName(a.wishes, 1).localeCompare(getWishClassName(b.wishes, 1));
          break;
        case 'wish2':
          comparison = getWishClassName(a.wishes, 2).localeCompare(getWishClassName(b.wishes, 2));
          break;
        case 'wish3':
          comparison = getWishClassName(a.wishes, 3).localeCompare(getWishClassName(b.wishes, 3));
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [members, sortColumn, sortDirection, language]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
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

  const renderWishCell = (memberId: string, wishes: WishChoice[], choiceIndex: number) => {
    const wish = wishes.find(w => w.choice_index === choiceIndex);
    
    // Empty state matching editor structure
    if (!wish) {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="h-7 w-full rounded-md border border-dashed border-muted-foreground/20 bg-transparent flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/30">{language === 'fr' ? 'Classe' : 'Class'}</span>
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
            <span className="text-[10px] text-muted-foreground/30">{language === 'fr' ? 'Classe' : 'Class'}</span>
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
            <span className="truncate">{cls.name[language]}</span>
          </div>
          
          {/* Validation badge */}
          <WishValidationBadge
            status={validationStatus}
            validatedBy={wish.validated_by_username}
            validatedAt={wish.validated_at}
            isGM={isGM}
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
                  <span className="text-muted-foreground">{spec.name[language]}</span>
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
          />
        </div>
        {canRemove ? (
          <button
            onClick={() => onRemoveWish(wishIndex)}
            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded"
            title={t.common.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : hasContent && (
          <button
            onClick={() => onClearWish(wishIndex)}
            className="h-7 w-7 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors rounded"
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

  if (members.length === 0) {
    return (
      <GlowCard className="overflow-hidden" hoverable={false}>
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
            if (regionSlug && serverSlug && guildSlug) {
              navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/member/${member.id}`);
            }
          };

          // Mobile doesn't support inline editing in the roster table.
          // So we redirect the user to the dedicated Wishes editor page.
          const handleStartEditing = () => {
            if (!isOwnRow) return;
            if (!regionSlug || !serverSlug || !guildSlug) return;

            const qp = selectedRosterId ? `?rosterId=${encodeURIComponent(selectedRosterId)}` : '';
            navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/wishes${qp}`);
          };

          return (
            <MobileRosterCard
              key={member.id}
              member={member}
              isOwnRow={isOwnRow}
              isGM={isGM}
              onStartEditing={handleStartEditing}
              onValidateWish={onValidateWish}
              onClick={handleCardClick}
            />
          );
        })}
      </div>
    );
  }
  // Desktop view - table layout
  return (
    <GlowCard className="overflow-hidden" hoverable={false}>
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <SortableHeader column="player" className="w-[120px] md:w-[140px]">{t.dashboard.player}</SortableHeader>
              <SortableHeader column="status" className="w-[100px] md:w-[120px]">{t.wishes.status}</SortableHeader>
              <SortableHeader column="wish1"><span className="hidden md:inline">{t.dashboard.firstChoice}</span><span className="md:hidden">#1</span></SortableHeader>
              <SortableHeader column="wish2"><span className="hidden md:inline">{t.dashboard.secondChoice}</span><span className="md:hidden">#2</span></SortableHeader>
              <SortableHeader column="wish3"><span className="hidden md:inline">{t.dashboard.thirdChoice}</span><span className="md:hidden">#3</span></SortableHeader>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3 w-[100px] md:w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => {
              const isOwnRow = member.id === currentUserId;
              const isEditing = editingUserId === member.id;
              const extraWishes = getExtraWishesCount(member.wishes);
              
              const handleRowClick = () => {
                // Navigate to member wishes page (read-only view) for all members
                if (!isEditing && regionSlug && serverSlug && guildSlug) {
                  navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/member/${member.id}`);
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
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{member.username}</span>
                        {!isEditing && extraWishes > 0 && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground border-muted-foreground/30 flex-shrink-0">
                                  +{extraWishes}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {extraWishes + 3} {language === 'fr' ? 'vœux au total' : 'wishes total'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                        />
                      ) : (
                        <Badge 
                          variant={member.status === 'confirmed' ? 'default' : 'outline'}
                          className={cn(
                            "text-[10px] md:text-xs px-1.5 py-0.5",
                            member.status === 'confirmed' 
                              ? 'bg-healer/20 text-healer border-healer/30' 
                              : member.status === 'withdrawn'
                              ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-amber-500/20 text-amber-500 border-amber-500/30'
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
                      {isEditing ? renderEditWishCell(0, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 1)}
                    </TableCell>
                    <TableCell className="py-2 px-2 md:px-3">
                      {isEditing ? renderEditWishCell(1, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 2)}
                    </TableCell>
                    <TableCell className="py-2 px-2 md:px-3">
                      {isEditing ? renderEditWishCell(2, editWishes.length > 1) : renderWishCell(member.id, member.wishes, 3)}
                    </TableCell>
                    <TableCell className="py-2 px-2 md:px-3">
                      {isOwnRow && (
                        <div className="flex gap-1.5 justify-end">
                          {isEditing ? (
                            <>
                              <CosmicButton 
                                size="sm" 
                                variant="outline" 
                                onClick={onCancelEditing}
                                className="h-8 px-2"
                              >
                                <X className="h-4 w-4" strokeWidth={1.5} />
                              </CosmicButton>
                              <CosmicButton 
                                size="sm" 
                                onClick={onSaveEditing}
                                loading={saving}
                                className="h-8 px-3"
                              >
                                <Save className="h-4 w-4" strokeWidth={1.5} />
                              </CosmicButton>
                            </>
                          ) : (
                            <CosmicButton 
                              size="sm" 
                              variant="outline" 
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartEditing(member);
                              }}
                              icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                              className="h-8 px-3"
                            >
                              <span className="hidden md:inline">{t.common.edit}</span>
                            </CosmicButton>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Additional wishes rows when editing */}
                  {isEditing && editWishes.length > 3 && (
                    <TableRow className="border-border/10 bg-primary/[0.03]">
                      <TableCell colSpan={2} className="py-2 px-2 md:px-3">
                        <span className="text-xs text-muted-foreground">
                          {language === 'fr' ? 'Vœux supplémentaires' : 'Additional wishes'}
                        </span>
                      </TableCell>
                      {editWishes.slice(3, 6).map((_, idx) => (
                        <TableCell key={idx + 3} className="py-2 px-2 md:px-3">
                          {renderEditWishCell(idx + 3, editWishes.length > 1)}
                        </TableCell>
                      ))}
                      <TableCell className="py-2 px-2 md:px-3" />
                    </TableRow>
                  )}
                  
                  {/* Add wish button row when editing */}
                  {isEditing && editWishes.length < maxWishes && (
                    <TableRow className="border-border/10 bg-primary/[0.02]">
                      <TableCell colSpan={6} className="py-2 px-2 md:px-3">
                        <button
                          onClick={onAddWish}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {language === 'fr' ? 'Ajouter un vœu' : 'Add a wish'}
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