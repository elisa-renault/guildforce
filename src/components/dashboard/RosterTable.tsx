import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GlowCard } from '@/components/GlowCard';
import { CosmicButton } from '@/components/CosmicButton';
import { RoleBadge } from '@/components/RoleBadge';
import { CheckCircle, HelpCircle, XCircle, Pencil, X, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getRolesFromSpecs } from '@/data/wowClasses';
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
  onToggleRow: (memberId: string) => void;
  onStartEditing: (member: MemberWish) => void;
  onCancelEditing: () => void;
  onUpdateEditWish: (index: number, field: keyof WishData, value: any) => void;
  onEditStatusChange: (status: CommitmentStatus) => void;
  onSaveEditing: () => void;
}

export const RosterTable = ({
  members,
  currentUserId,
  editingUserId,
  editWishes,
  editStatus,
  saving,
  onStartEditing,
  onCancelEditing,
  onUpdateEditWish,
  onEditStatusChange,
  onSaveEditing,
}: RosterTableProps) => {
  const { t, language } = useLanguage();

  const renderWishCell = (wishes: WishChoice[], choiceIndex: number) => {
    const wish = wishes.find(w => w.choice_index === choiceIndex);
    if (!wish) return <span className="text-muted-foreground text-xs">-</span>;

    const cls = getClassById(wish.class_id);
    if (!cls) return <span className="text-muted-foreground text-xs">-</span>;

    const roles = getRolesFromSpecs(wish.spec_ids);

    return (
      <div className="flex items-center gap-1.5">
        <Badge 
          variant="outline" 
          className="text-[10px] md:text-xs font-medium px-1.5 py-0"
          style={{ 
            backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
            borderColor: `hsl(var(--class-${cls.id}) / 0.4)`,
            color: `hsl(var(--class-${cls.id}))`
          }}
        >
          <span className="hidden md:inline">{cls.name[language]}</span>
          <span className="md:hidden">{cls.name[language].slice(0, 3)}</span>
        </Badge>
        <div className="flex gap-0.5">
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
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3">{t.dashboard.player}</TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3">{t.wishes.status}</TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3"><span className="hidden md:inline">{t.dashboard.firstChoice}</span><span className="md:hidden">#1</span></TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3"><span className="hidden md:inline">{t.dashboard.secondChoice}</span><span className="md:hidden">#2</span></TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3"><span className="hidden md:inline">{t.dashboard.thirdChoice}</span><span className="md:hidden">#3</span></TableHead>
              <TableHead className="text-muted-foreground text-xs py-2 px-2 md:px-3 w-[80px] md:w-[100px]"></TableHead>
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
                  <TableCell className="font-medium text-foreground text-sm py-2 px-2 md:px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[80px] md:max-w-none">{member.username}</span>
                      {isOwnRow && !isEditing && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-primary border-primary/30 bg-primary/10">
                          {t.common.you}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 px-2 md:px-3">
                    {isEditing ? (
                      <CommitmentToggle 
                        status={editStatus} 
                        onChange={onEditStatusChange}
                        compact
                      />
                    ) : (
                      <Badge 
                        variant={member.status === 'confirmed' ? 'default' : 'outline'}
                        className={cn(
                          "text-[10px] md:text-xs px-1.5 py-0",
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
                    {isEditing ? renderEditWishCell(0) : renderWishCell(member.wishes, 1)}
                  </TableCell>
                  <TableCell className="py-2 px-2 md:px-3">
                    {isEditing ? renderEditWishCell(1) : renderWishCell(member.wishes, 2)}
                  </TableCell>
                  <TableCell className="py-2 px-2 md:px-3">
                    {isEditing ? renderEditWishCell(2) : renderWishCell(member.wishes, 3)}
                  </TableCell>
                  <TableCell className="py-2 px-2 md:px-3">
                    {isOwnRow && (
                      isEditing ? (
                        <div className="flex gap-1">
                          <CosmicButton 
                            size="sm" 
                            variant="outline" 
                            onClick={onCancelEditing}
                            className="h-7 px-1.5"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </CosmicButton>
                          <CosmicButton 
                            size="sm" 
                            onClick={onSaveEditing}
                            loading={saving}
                            className="h-7 px-1.5"
                          >
                            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
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
                          icon={<Pencil className="h-3 w-3" strokeWidth={1.5} />}
                          className="h-7 px-2"
                        >
                          <span className="hidden md:inline">{t.common.edit}</span>
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