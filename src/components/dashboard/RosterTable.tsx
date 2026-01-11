import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { RoleBadge } from '@/components/RoleBadge';
import { CheckCircle, HelpCircle, Pencil, X, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getRolesFromSpecs } from '@/data/wowClasses';
import { MemberWish, WishData, WishChoice } from '@/types/guild';
import { InlineWishEditor } from './InlineWishEditor';
import { CommitmentToggle } from '@/components/CommitmentToggle';
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
  editingUserId,
  editWishes,
  editConfirmed,
  saving,
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

  const renderEditWishCell = (wishIndex: number) => {
    const wish = editWishes[wishIndex];
    return (
      <InlineWishEditor
        wish={wish}
        choiceIndex={wishIndex}
        onChange={(field, value) => onUpdateEditWish(wishIndex, field, value)}
      />
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
              <TableHead className="text-muted-foreground">{t.dashboard.player}</TableHead>
              <TableHead className="text-muted-foreground">{t.wishes.status}</TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.firstChoice}</TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.secondChoice}</TableHead>
              <TableHead className="text-muted-foreground">{t.dashboard.thirdChoice}</TableHead>
              <TableHead className="text-muted-foreground w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isOwnRow = member.id === currentUserId;
              const isEditing = editingUserId === member.id;
              
              return (
                <TableRow 
                  key={member.id}
                  className={cn(
                    "border-border/20",
                    isOwnRow ? "bg-primary/[0.02]" : "",
                    isEditing && "bg-primary/[0.05]"
                  )}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {member.username}
                      {isOwnRow && !isEditing && (
                        <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/10">
                          {t.common.you}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <CommitmentToggle 
                        confirmed={editConfirmed} 
                        onChange={onEditConfirmedChange}
                        compact
                      />
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? renderEditWishCell(0) : renderWishCell(member.wishes, 1)}
                  </TableCell>
                  <TableCell>
                    {isEditing ? renderEditWishCell(1) : renderWishCell(member.wishes, 2)}
                  </TableCell>
                  <TableCell>
                    {isEditing ? renderEditWishCell(2) : renderWishCell(member.wishes, 3)}
                  </TableCell>
                  <TableCell>
                    {isOwnRow && (
                      isEditing ? (
                        <div className="flex gap-1">
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
                            className="h-8 px-2"
                          >
                            <Save className="h-4 w-4" strokeWidth={1.5} />
                          </CosmicButton>
                        </div>
                      ) : (
                        <CosmicButton 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartEditing(member);
                          }}
                          icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          className="h-8"
                        >
                          <span className="hidden sm:inline">{t.common.edit}</span>
                        </CosmicButton>
                      )
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </GlowCard>
  );
};