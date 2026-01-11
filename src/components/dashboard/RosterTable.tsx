import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { RoleBadge } from '@/components/RoleBadge';
import { ChevronDown, ChevronRight, CheckCircle, HelpCircle, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getSpecById, getRolesFromSpecs } from '@/data/wowClasses';
import { MemberWish, WishData, WishChoice } from '@/types/guild';
import { MemberWishEditor } from './MemberWishEditor';
import { cn } from '@/lib/utils';

interface RosterTableProps {
  members: MemberWish[];
  currentUserId: string | undefined;
  expandedRows: Set<string>;
  editingUserId: string | null;
  editWishes: WishData[];
  editConfirmed: boolean;
  saving: boolean;
  onToggleRow: (memberId: string) => void;
  onStartEditing: (member: MemberWish) => void;
  onCancelEditing: () => void;
  onUpdateEditWish: (index: number, field: keyof WishData, value: any) => void;
  onEditConfirmedChange: (confirmed: boolean) => void;
  onSaveEditing: () => void;
}

export const RosterTable = ({
  members,
  currentUserId,
  expandedRows,
  editingUserId,
  editWishes,
  editConfirmed,
  saving,
  onToggleRow,
  onStartEditing,
  onCancelEditing,
  onUpdateEditWish,
  onEditConfirmedChange,
  onSaveEditing,
}: RosterTableProps) => {
  const { t, language } = useLanguage();

  const renderWishCell = (wishes: WishChoice[], choiceIndex: number) => {
    const wish = wishes.find(w => w.choice_index === choiceIndex);
    if (!wish) return <span className="text-muted-foreground">-</span>;

    const cls = getClassById(wish.class_id);
    if (!cls) return <span className="text-muted-foreground">-</span>;

    const roles = getRolesFromSpecs(wish.spec_ids);

    return (
      <div className="space-y-1.5">
        <Badge 
          variant="outline" 
          className={cn(
            'text-xs font-medium',
            `bg-class-${cls.id}/20 border-class-${cls.id}/50`
          )}
          style={{ 
            backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
            borderColor: `hsl(var(--class-${cls.id}) / 0.4)`,
            color: `hsl(var(--class-${cls.id}))`
          }}
        >
          {cls.name[language]}
        </Badge>
        <div className="flex flex-wrap gap-1">
          {roles.map(role => (
            <RoleBadge key={role} role={role} size="sm" />
          ))}
        </div>
      </div>
    );
  };

  const renderExpandedContent = (member: MemberWish) => {
    const isEditing = editingUserId === member.id;
    const isOwnRow = member.id === currentUserId;

    if (isEditing) {
      return (
        <MemberWishEditor
          wishes={editWishes}
          confirmed={editConfirmed}
          saving={saving}
          onWishChange={onUpdateEditWish}
          onConfirmedChange={onEditConfirmedChange}
          onSave={onSaveEditing}
          onCancel={onCancelEditing}
        />
      );
    }

    // Read-only expanded view
    return (
      <div className="p-6 bg-background/50 border-t border-border/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.dashboard.comments} & {t.wishes.specs}
          </h4>
          {isOwnRow && (
            <CosmicButton 
              size="sm" 
              variant="outline" 
              onClick={() => onStartEditing(member)}
              icon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
            >
              {t.wishes.editMyWishes}
            </CosmicButton>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(choiceIndex => {
            const wish = member.wishes.find(w => w.choice_index === choiceIndex);
            if (!wish) {
              return (
                <div key={choiceIndex} className="p-4 rounded bg-muted/10 border border-border/10">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {choiceIndex === 1 ? t.dashboard.firstChoice : choiceIndex === 2 ? t.dashboard.secondChoice : t.dashboard.thirdChoice}
                  </div>
                  <span className="text-muted-foreground text-sm">-</span>
                </div>
              );
            }

            const cls = getClassById(wish.class_id);
            const specs = wish.spec_ids.map(sid => getSpecById(sid)).filter(Boolean);

            return (
              <div key={choiceIndex} className="p-4 rounded bg-muted/10 border border-border/10">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {choiceIndex === 1 ? t.dashboard.firstChoice : choiceIndex === 2 ? t.dashboard.secondChoice : t.dashboard.thirdChoice}
                </div>
                {cls && (
                  <Badge 
                    variant="outline" 
                    className="text-xs font-medium mb-2"
                    style={{ 
                      backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
                      borderColor: `hsl(var(--class-${cls.id}) / 0.4)`,
                      color: `hsl(var(--class-${cls.id}))`
                    }}
                  >
                    {cls.name[language]}
                  </Badge>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {specs.map(spec => spec && (
                    <Badge key={spec.id} variant="outline" className="text-xs">
                      {spec.name[language]}
                    </Badge>
                  ))}
                </div>
                {wish.comment && (
                  <p className="text-sm text-muted-foreground mt-3 italic">"{wish.comment}"</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-muted-foreground w-8"></TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.player}</TableHead>
              <TableHead className="text-muted-foreground">{t.wishes.status}</TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.firstChoice}</TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.secondChoice}</TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.thirdChoice}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isExpanded = expandedRows.has(member.id);
              const isOwnRow = member.id === currentUserId;
              
              return (
                <Fragment key={member.id}>
                  <TableRow 
                    className={cn(
                      "border-border/20 cursor-pointer",
                      isOwnRow ? "hover:bg-primary/5 bg-primary/[0.02]" : "hover:bg-white/[0.02]",
                      isExpanded && "bg-white/[0.03]"
                    )}
                    onClick={() => onToggleRow(member.id)}
                  >
                    <TableCell className="w-8 pr-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {member.username}
                        {isOwnRow && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
                            {t.common.edit}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={member.status === 'confirmed' ? 'default' : 'outline'}
                        className={member.status === 'confirmed' 
                          ? 'bg-healer/20 text-healer border-healer/30' 
                          : 'border-border/50 text-muted-foreground'
                        }
                      >
                        {member.status === 'confirmed' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" strokeWidth={1.5} /> {t.wishes.confirmed}</>
                        ) : (
                          <><HelpCircle className="h-3 w-3 mr-1" strokeWidth={1.5} /> {t.wishes.potential}</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderWishCell(member.wishes, 1)}</TableCell>
                    <TableCell>{renderWishCell(member.wishes, 2)}</TableCell>
                    <TableCell>{renderWishCell(member.wishes, 3)}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent border-border/20">
                      <TableCell colSpan={6} className="p-0">
                        {renderExpandedContent(member)}
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