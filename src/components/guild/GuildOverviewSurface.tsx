import {
  CheckCircle2,
  ChevronDown,
  Eye,
  Heart,
  LayoutDashboard,
  Shield,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';

import type { CommitmentStatus } from '@/components/CommitmentToggle';
import type { SemanticKey } from '@/i18n/semantic';
import type { ReactNode } from 'react';

import { CosmicButton } from '@/components/CosmicButton';
import { GlowCard } from '@/components/GlowCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, getLocalizedClassName, getLocalizedSpecName, getSpecById } from '@/data/wowClasses';
import { interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import {
  commitmentCalloutClass,
  commitmentTextClass,
  toneCalloutClass,
  toneTextClass,
  wowClassTextClass,
} from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

export interface OverviewWishSummary {
  choice_index: number;
  class_id: string;
  spec_ids: string[];
  validation_status: string;
}

interface OverviewGuildData {
  name: string;
  server?: string | null;
}

interface GuildOverviewSurfaceProps {
  guild: OverviewGuildData;
  greetingName?: string | null;
  commitmentStatus: CommitmentStatus;
  myWishes: OverviewWishSummary[];
  totalMembers: number;
  confirmedMembers: number;
  isAdminReadOnly?: boolean;
  pollWidget?: ReactNode;
  onEditWishes: () => void;
  onOpenRoster: () => void;
  onOpenMembers: () => void;
}

const getStatusConfig = (status: CommitmentStatus) => {
  switch (status) {
    case 'confirmed':
      return {
        type: 'confirmed' as const,
        icon: CheckCircle2,
      };
    case 'withdrawn':
      return {
        type: 'withdrawn' as const,
        icon: Shield,
      };
    default:
      return {
        type: 'undecided' as const,
        icon: Heart,
      };
  }
};

export const GuildOverviewSurface = ({
  guild,
  greetingName,
  commitmentStatus,
  myWishes,
  totalMembers,
  confirmedMembers,
  isAdminReadOnly = false,
  pollWidget,
  onEditWishes,
  onOpenRoster,
  onOpenMembers,
}: GuildOverviewSurfaceProps) => {
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const statusConfig = getStatusConfig(commitmentStatus);
  const StatusIcon = statusConfig.icon;
  const statusLabel = t.wishes.commitment[statusConfig.type];
  const firstApproved = myWishes.find((wish) => wish.validation_status === 'approved');

  return (
    <PageContainer as="main" className="relative z-10 py-5 md:py-6" width="workspace">
      {isAdminReadOnly && (
        <div className={cn('mb-4 flex items-center justify-center gap-2 rounded-lg border p-2', toneCalloutClass('warning'))}>
          <Eye className={cn('h-4 w-4', toneTextClass('warning'))} />
          <span className={cn('text-sm font-medium', toneTextClass('warning'))}>
            {s('overview.admin_read_only')}
          </span>
        </div>
      )}

      <PageHeader
        className="mb-4"
        icon={LayoutDashboard}
        title={`${t.guildNav.welcome}${greetingName ? `, ${greetingName}` : ''}`}
        description={`${guild.name} • ${guild.server || ''}`}
        titleClassName="font-sans font-medium"
        bordered={false}
        meta={(
          <>
            <Badge variant="secondary" className="text-xs">
              {totalMembers} {t.guild.members}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                commitmentCalloutClass(statusConfig.type),
                commitmentTextClass(statusConfig.type),
              )}
            >
              <StatusIcon className="mr-1 h-3.5 w-3.5" />
              {statusLabel}
            </Badge>
          </>
        )}
      />

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <GlowCard surface="section" className="overflow-hidden">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-foreground">
                {t.guildNav.myStatus}
              </h2>
              {firstApproved ? (
                <div className={cn('flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5', toneCalloutClass('success'))}>
                  <CheckCircle2 className={cn('h-4 w-4', toneTextClass('success'))} />
                  <span className={cn('text-sm font-medium', toneTextClass('success'))}>
                    {t.wishes.choice} #{firstApproved.choice_index}
                    {getClassById(firstApproved.class_id) && (
                      <span className="ml-1 opacity-80">
                        ({getLocalizedClassName(firstApproved.class_id, language)})
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5">
                  <span className="text-sm text-muted-foreground">
                    {t.guildNav.noWishApproved}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="mb-3 text-sm text-muted-foreground">
                {t.guildNav.myWishes}
              </h3>
              {myWishes.length > 0 ? (
                <div className="space-y-2">
                  {myWishes.slice(0, 3).map((wish) => (
                    <OverviewWishRow key={wish.choice_index} wish={wish} />
                  ))}

                  {myWishes.length > 3 && (
                    <Collapsible>
                      <CollapsibleTrigger className="group flex w-full items-center gap-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                        <span>
                          {interpolateMessage(s('overview.more_wishes'), { count: myWishes.length - 3 })}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2">
                        {myWishes.slice(3).map((wish) => (
                          <OverviewWishRow key={wish.choice_index} wish={wish} />
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  {t.guildNav.noWishesYet}
                </p>
              )}
            </div>

            <div className="mt-3">
              <CosmicButton
                onClick={onEditWishes}
                icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                className="w-full"
              >
                {t.wishes.editMyWishes}
              </CosmicButton>
            </div>
          </GlowCard>

          <GlowCard surface="section">
            <h2 className="mb-3 font-medium text-foreground">
              {t.guildNav.guildOverview}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-medium text-foreground">{totalMembers}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.guild.members}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded bg-healer/10">
                  <CheckCircle2 className="h-5 w-5 text-healer" />
                </div>
                <div>
                  <p className="text-xl font-medium text-foreground">{confirmedMembers}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.dashboard.confirmedPlayers}
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        <div className="min-w-0 space-y-4">
          {pollWidget}

          <GlowCard surface="section">
            <h2 className="mb-3 font-medium text-foreground">
              {t.guildNav.quickAccess}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenRoster}
                className="flex items-center gap-2 rounded border border-border/35 bg-background/25 px-3 py-2.5 text-left transition-colors hover:bg-muted/25"
              >
                <Swords className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {t.guildNav.wishesTable}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenMembers}
                className="flex items-center gap-2 rounded border border-border/35 bg-background/25 px-3 py-2.5 text-left transition-colors hover:bg-muted/25"
              >
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {t.guild.members}
                </span>
              </button>
            </div>
          </GlowCard>
        </div>
      </div>
    </PageContainer>
  );
};

const OverviewWishRow = ({ wish }: { wish: OverviewWishSummary }) => {
  const { language } = useLanguage();
  const wowClass = getClassById(wish.class_id);
  const specs = wish.spec_ids.map((id) => getSpecById(id)).filter(Boolean);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {wish.choice_index}
      </div>
      {wowClass && (
        <span className={cn('text-sm font-medium', wowClassTextClass(wowClass.id))}>
          {getLocalizedClassName(wowClass.id, language)}
        </span>
      )}
      <div className="ml-auto flex flex-wrap justify-end gap-1">
        {specs.map((spec) => (
          <Badge key={spec!.id} variant="outline" className="px-1.5 py-0.5 text-xs">
            {getLocalizedSpecName(spec!.id, language)}
          </Badge>
        ))}
      </div>
    </div>
  );
};
