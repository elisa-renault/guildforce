import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, HelpCircle, XCircle, Pencil, X, Save, Shield, Heart, Swords, MessageSquare, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getSpecById } from '@/data/wowClasses';
import { MemberWish, WishData, WishChoice } from '@/types/guild';
import { InlineWishEditor } from './InlineWishEditor';
import { CommitmentToggle, CommitmentStatus } from '@/components/CommitmentToggle';
import { cn } from '@/lib/utils';

interface RosterTableProps {
  members: MemberWish[];
  currentUserId: string | undefined;
  expandedRows: Set<string>;
  editingUserId: string | null;
  editWishes: WishData[];
  editStatus: CommitmentStatus;
  saving: boolean;
  maxWishes: number;
  onToggleRow: (memberId: string) => void;
  onStartEditing: (member: MemberWish) => void;
  onCancelEditing: () => void;
  onUpdateEditWish: (index: number, field: keyof WishData, value: any) => void;
  onEditStatusChange: (status: CommitmentStatus) => void;
  onSaveEditing: () => void;
  onAddWish: () => void;
  onRemoveWish: (index: number) => void;
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
  editingUserId,
  editWishes,
  editStatus,
  saving,
  maxWishes,
  onStartEditing,
  onCancelEditing,
  onUpdateEditWish,
  onEditStatusChange,
  onSaveEditing,
  onAddWish,
  onRemoveWish,
}: RosterTableProps) => {
  const { t, language } = useLanguage();

  const renderWishCell = (wishes: WishChoice[], choiceIndex: number) => {
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
    const firstSpec = specs[0];

    return (
      <div className="flex flex-col gap-1.5">
        {/* Class - same height as editor button */}
        <div 
          className="h-7 w-full rounded-md flex items-center px-2 text-xs font-medium"
          style={{ 
            backgroundColor: `hsl(var(--class-${cls.id}) / 0.2)`,
            color: `hsl(var(--class-${cls.id}))`
          }}
        >
          <span className="truncate">{cls.name[language]}</span>
        </div>
        
        {/* Spec row - same height as editor spec row */}
        <div className="h-6 w-full flex items-center gap-1 text-[10px]">
          {firstSpec ? (
            <>
              {(() => {
                const config = roleConfig[firstSpec.role];
                const Icon = config?.icon;
                return Icon ? <Icon className={cn("h-3 w-3 flex-shrink-0", config.color)} /> : null;
              })()}
              <span className="truncate text-muted-foreground flex-1">{firstSpec.name[language]}</span>
              {specs.length > 1 && (
                <span className="text-muted-foreground/60 flex-shrink-0">+{specs.length - 1}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/50 flex-1">—</span>
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
    
    return (
      <div className="flex items-start gap-1">
        <div className="flex-1">
          <InlineWishEditor
            wish={wish}
            choiceIndex={wishIndex}
            onChange={(field, value) => onUpdateEditWish(wishIndex, field, value)}
          />
        </div>
        {canRemove && (
          <button
            onClick={() => onRemoveWish(wishIndex)}
            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded"
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

  return (
    <GlowCard className="overflow-hidden" hoverable={false}>
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3 w-[120px] md:w-[140px]">{t.dashboard.player}</TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3 w-[100px] md:w-[120px]">{t.wishes.status}</TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3"><span className="hidden md:inline">{t.dashboard.firstChoice}</span><span className="md:hidden">#1</span></TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3"><span className="hidden md:inline">{t.dashboard.secondChoice}</span><span className="md:hidden">#2</span></TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3"><span className="hidden md:inline">{t.dashboard.thirdChoice}</span><span className="md:hidden">#3</span></TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3 w-[100px] md:w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isOwnRow = member.id === currentUserId;
              const isEditing = editingUserId === member.id;
              const extraWishes = getExtraWishesCount(member.wishes);
              
              return (
                <Fragment key={member.id}>
                  <TableRow 
                    className={cn(
                      "border-border/20",
                      isOwnRow ? "bg-primary/[0.02]" : "",
                      isEditing && "bg-primary/[0.05]"
                    )}
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
                      {isEditing ? renderEditWishCell(0, editWishes.length > 1) : renderWishCell(member.wishes, 1)}
                    </TableCell>
                    <TableCell className="py-2 px-2 md:px-3">
                      {isEditing ? renderEditWishCell(1, editWishes.length > 1) : renderWishCell(member.wishes, 2)}
                    </TableCell>
                    <TableCell className="py-2 px-2 md:px-3">
                      {isEditing ? renderEditWishCell(2, editWishes.length > 1) : renderWishCell(member.wishes, 3)}
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