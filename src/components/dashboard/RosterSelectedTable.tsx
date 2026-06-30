import {
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Heart,
  ListChecks,
  Shield,
  Swords,
  Users,
} from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { MemberWish, WishChoice } from '@/types/guild';

import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { useIsMobile } from '@/hooks/use-mobile';
import { interpolateMessage } from '@/i18n/format';
import { cn } from '@/lib/utils';

interface RosterSelectedTableProps {
  members: MemberWish[];
  currentUserId?: string;
  selectedRosterId?: string | null;
  selectedSeasonId?: string | null;
  onViewFullTable?: () => void;
}

type BucketKey = 'tank' | 'healer' | 'melee' | 'ranged';

const bucketOrder: BucketKey[] = ['tank', 'healer', 'melee', 'ranged'];

const roleConfig = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  melee: { icon: Swords, color: 'text-dps' },
  ranged: { icon: Crosshair, color: 'text-dps' },
} satisfies Record<BucketKey, { icon: typeof Shield; color: string }>;

const getApprovedWishes = (member: MemberWish) =>
  (member.wishes || [])
    .filter(
      (wish) =>
        !!wish.class_id && (wish.validation_status || 'pending') === 'approved',
    )
    .sort((a, b) => a.choice_index - b.choice_index);

const formatCharacterRealmSubtitle = (member: MemberWish) => (
  [member.mainCharacterName, member.realmName].filter(Boolean).join(' - ')
);

const getWishBucket = (wish: WishChoice): BucketKey => {
  const primarySpecId = wish.spec_ids?.[0];
  const primarySpec = primarySpecId ? getSpecById(primarySpecId) : null;

  if (!primarySpec) return 'melee';
  if (primarySpec.role === 'tank') return 'tank';
  if (primarySpec.role === 'healer') return 'healer';
  return primarySpec.range === 'ranged' ? 'ranged' : 'melee';
};

const SummaryHeader = ({
  memberCount,
  displayedWishesCount,
  showingAll,
  onToggle,
}: {
  memberCount: number;
  displayedWishesCount: number;
  showingAll: boolean;
  onToggle: () => void;
}) => {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md md:sticky md:top-2 md:z-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">{t.dashboard.selectedValidatedView}</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t.dashboard.selectedValidatedSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Badge variant="outline" className="gap-1 border-border/50 bg-background/50 text-[11px] text-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {interpolateMessage(t.dashboard.selectedValidatedMembersCount, {
              count: memberCount,
            })}
          </Badge>
          <Badge variant="outline" className="gap-1 border-status-success/30 bg-status-success/10 text-[11px] text-status-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {interpolateMessage(t.dashboard.selectedValidatedWishesTotal, {
              count: displayedWishesCount,
            })}
          </Badge>
          <CosmicButton size="sm" variant="outline" onClick={onToggle} className="h-7 px-2 text-[11px]">
            {showingAll ? t.dashboard.selectedValidatedShowPrimary : t.dashboard.selectedValidatedShowAll}
          </CosmicButton>
        </div>
      </div>
    </div>
  );
};

const ApprovedWishItem = ({ wish }: { wish: WishChoice }) => {
  const { language } = useLanguage();
  const wowClass = getClassById(wish.class_id);

  if (!wowClass) return null;

  const specs = wish.spec_ids.map((id) => getSpecById(id)).filter(Boolean);

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1.5"
      style={{
        backgroundColor: `hsl(var(--class-${wowClass.id}) / 0.08)`,
        borderColor: `hsl(var(--class-${wowClass.id}) / 0.18)`,
      }}
    >
      <Badge variant="outline" className="h-4.5 flex-shrink-0 border-border/35 px-1 text-[9px] text-muted-foreground">
        #{wish.choice_index}
      </Badge>

      <span
        className="inline-flex h-5 max-w-[110px] flex-shrink-0 items-center rounded-md px-1.5 text-[10px] font-medium"
        style={{
          backgroundColor: `hsl(var(--class-${wowClass.id}) / 0.16)`,
          color: `hsl(var(--class-${wowClass.id}))`,
        }}
      >
        <span className="truncate">{getLocalizedClassName(wowClass.id, language)}</span>
      </span>

      <div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
        {specs.map((spec) => {
          const Icon =
            spec.role === 'tank'
              ? Shield
              : spec.role === 'healer'
                ? Heart
                : spec.range === 'ranged'
                  ? Crosshair
                  : Swords;
          const toneClass =
            spec.role === 'tank'
              ? 'text-tank'
              : spec.role === 'healer'
                ? 'text-healer'
                : 'text-dps';

          return (
            <div key={spec.id} className="flex items-center gap-0.5">
              <Icon className={cn('h-2.5 w-2.5 flex-shrink-0', toneClass)} />
              <span className="truncate text-muted-foreground">{getLocalizedSpecName(spec.id, language)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ApprovedWishList = ({ wishes }: { wishes: WishChoice[] }) => (
  <div className="space-y-1">
    {wishes.map((wish) => (
      <ApprovedWishItem key={`${wish.choice_index}-${wish.class_id}`} wish={wish} />
    ))}
  </div>
);

const GroupSection = ({
  title,
  count,
  icon: Icon,
  iconClassName,
  members,
  currentUserId,
  youLabel,
  isMobile,
  onNavigate,
  onKeyDown,
}: {
  title: string;
  count: number;
  icon: typeof Shield;
  iconClassName: string;
  members: Array<{ member: MemberWish; displayedWishes: WishChoice[]; hiddenWishCount: number }>;
  currentUserId?: string;
  youLabel: string;
  isMobile: boolean;
  onNavigate: (member: MemberWish) => void;
  onKeyDown: (event: KeyboardEvent, member: MemberWish) => void;
}) => {
  if (members.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconClassName)} />
        <h3 className="text-sm font-medium text-foreground">
          {title} ({count})
        </h3>
      </div>

      <div className={cn('gap-2', isMobile ? 'space-y-2' : 'grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4')}>
        {members.map(({ member, displayedWishes, hiddenWishCount }) => {
          const isClickable = !member.isExternal;
          const characterRealmSubtitle = formatCharacterRealmSubtitle(member);

          return (
            <GlowCard
              surface="section"
              key={member.id}
              className={cn(
                'p-2.5 transition-colors',
                isClickable && 'cursor-pointer hover:border-primary/30 hover:bg-primary/[0.04]',
                member.id === currentUserId && 'bg-primary/[0.03]',
              )}
              onClick={() => onNavigate(member)}
              onKeyDown={(event) => onKeyDown(event, member)}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              <div className="flex min-w-0 items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate text-sm font-medium leading-none text-foreground">{member.username}</div>
                    {member.id === currentUserId && (
                      <Badge variant="outline" className="h-4.5 border-border/35 px-1 text-[9px] text-muted-foreground">
                        {youLabel}
                      </Badge>
                    )}
                    {hiddenWishCount > 0 && (
                      <Badge variant="outline" className="h-4.5 border-border/35 px-1 text-[9px] text-muted-foreground">
                        +{hiddenWishCount}
                      </Badge>
                    )}
                  </div>
                  {characterRealmSubtitle && (
                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {characterRealmSubtitle}
                    </div>
                  )}
                </div>
                {isClickable && <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />}
              </div>

              <div className="mt-2">
                <ApprovedWishList wishes={displayedWishes} />
              </div>
            </GlowCard>
          );
        })}
      </div>
    </section>
  );
};

export const RosterSelectedTable = ({
  members,
  currentUserId,
  selectedRosterId,
  selectedSeasonId,
  onViewFullTable,
}: RosterSelectedTableProps) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { regionSlug, serverSlug, guildSlug } = useParams();
  const isMobile = useIsMobile();
  const [showAllApproved, setShowAllApproved] = useState(false);

  const groupedMembers = useMemo(() => {
    const groups: Record<
      BucketKey,
      Array<{ member: MemberWish; displayedWishes: WishChoice[]; hiddenWishCount: number; sortingWish: WishChoice }>
    > = {
      tank: [],
      healer: [],
      melee: [],
      ranged: [],
    };

    members.forEach((member) => {
      const approvedWishes = getApprovedWishes(member);
      const firstApprovedWish = approvedWishes[0];

      if (!firstApprovedWish) return;

      const displayedWishes = showAllApproved ? approvedWishes : [firstApprovedWish];
      const hiddenWishCount = Math.max(approvedWishes.length - displayedWishes.length, 0);

      groups[getWishBucket(firstApprovedWish)].push({
        member,
        displayedWishes,
        hiddenWishCount,
        sortingWish: firstApprovedWish,
      });
    });

    bucketOrder.forEach((bucket) => {
      groups[bucket].sort((a, b) => {
        const aClassName = getLocalizedClassName(a.sortingWish.class_id, language);
        const bClassName = getLocalizedClassName(b.sortingWish.class_id, language);
        const classComparison = aClassName.localeCompare(bClassName, undefined, {
          sensitivity: 'base',
        });

        if (classComparison !== 0) return classComparison;

        const aPrimarySpecId = a.sortingWish.spec_ids[0];
        const bPrimarySpecId = b.sortingWish.spec_ids[0];
        const aPrimarySpecName = aPrimarySpecId ? getLocalizedSpecName(aPrimarySpecId, language) : '';
        const bPrimarySpecName = bPrimarySpecId ? getLocalizedSpecName(bPrimarySpecId, language) : '';
        const specComparison = aPrimarySpecName.localeCompare(bPrimarySpecName, undefined, {
          sensitivity: 'base',
        });

        if (specComparison !== 0) return specComparison;

        return a.member.username.localeCompare(b.member.username, undefined, {
          sensitivity: 'base',
        });
      });
    });

    return groups;
  }, [language, members, showAllApproved]);

  const displayedWishesCount = useMemo(
    () =>
      bucketOrder.reduce(
        (sum, bucket) =>
          sum + groupedMembers[bucket].reduce((bucketSum, entry) => bucketSum + entry.displayedWishes.length, 0),
        0,
      ),
    [groupedMembers],
  );

  const groupMeta: Record<BucketKey, { title: string; icon: typeof Shield; iconClassName: string }> = {
    tank: {
      title: t.dashboard.selectedValidatedGroupTanks,
      icon: roleConfig.tank.icon,
      iconClassName: roleConfig.tank.color,
    },
    healer: {
      title: t.dashboard.selectedValidatedGroupHealers,
      icon: roleConfig.healer.icon,
      iconClassName: roleConfig.healer.color,
    },
    melee: {
      title: t.dashboard.selectedValidatedGroupMelee,
      icon: roleConfig.melee.icon,
      iconClassName: roleConfig.melee.color,
    },
    ranged: {
      title: t.dashboard.selectedValidatedGroupRanged,
      icon: roleConfig.ranged.icon,
      iconClassName: roleConfig.ranged.color,
    },
  };

  const handleNavigate = (member: MemberWish) => {
    if (member.isExternal || !regionSlug || !serverSlug || !guildSlug) return;
    const qp = selectedRosterId ? `?rosterId=${encodeURIComponent(selectedRosterId)}` : '';
    const seasonParam = selectedSeasonId ? `${qp ? '&' : '?'}seasonId=${encodeURIComponent(selectedSeasonId)}` : '';
    navigate(`/guild/${regionSlug}/${serverSlug}/${guildSlug}/member/${member.id}${qp}${seasonParam}`);
  };

  const handleMemberKeyDown = (event: KeyboardEvent, member: MemberWish) => {
    if (member.isExternal) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleNavigate(member);
  };

  if (members.length === 0) {
    return (
      <div className="space-y-3">
        <SummaryHeader
          memberCount={0}
          displayedWishesCount={0}
          showingAll={showAllApproved}
          onToggle={() => setShowAllApproved((current) => !current)}
        />
        <GlowCard surface="section" className="overflow-hidden p-0">
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <div className="max-w-md space-y-2">
              <div className="text-sm font-medium text-foreground">{t.dashboard.selectedValidatedEmpty}</div>
              <div className="text-xs leading-relaxed text-muted-foreground">
                {t.dashboard.selectedValidatedEmptyDescription}
              </div>
            </div>
            {onViewFullTable && (
              <CosmicButton size="sm" variant="outline" onClick={onViewFullTable}>
                {t.dashboard.viewFullTable}
              </CosmicButton>
            )}
          </div>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SummaryHeader
        memberCount={members.length}
        displayedWishesCount={displayedWishesCount}
        showingAll={showAllApproved}
        onToggle={() => setShowAllApproved((current) => !current)}
      />

      {bucketOrder.map((bucket) => (
        <GroupSection
          key={bucket}
          title={groupMeta[bucket].title}
          count={groupedMembers[bucket].length}
          icon={groupMeta[bucket].icon}
          iconClassName={groupMeta[bucket].iconClassName}
          members={groupedMembers[bucket]}
          currentUserId={currentUserId}
          youLabel={t.common.you}
          isMobile={isMobile}
          onNavigate={handleNavigate}
          onKeyDown={handleMemberKeyDown}
        />
      ))}
    </div>
  );
};
