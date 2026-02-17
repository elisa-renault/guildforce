import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  formatPercentValue,
  formatSignedPercentDelta,
  getDeltaColorClass,
} from './adminDashboardMetrics';
import { 
  Activity,
  Users, 
  Shield, 
  MessageSquare, 
  AlertTriangle,
  ChevronRight,
  FileText,
  Bug,
  Trash2,
  Sparkles,
  ClipboardList,
  PlayCircle,
  CheckCircle2,
  BarChart2,
  Info
} from 'lucide-react';
import { AdminSection } from './AdminSettingsSidebar';

interface AdminStats {
  totalUsers: number;
  totalGuilds: number;
  totalTopics: number;
  totalPosts: number;
  pendingReports: number;
  activeSanctions: number;
  openBugs: number;
  pendingDeletions: number;
  uniqueWishUsers: number;
  totalWishes: number;
  guildsWithWishes: number;
  guildsWithRosterWishes: number;
  guildEngagementRate: number;
  guildsWithTwoMembers: number;
  guildsWithTwoWishUsers: number;
  totalPolls: number;
  activePolls: number;
  closedPolls: number;
  pollVoters: number;
  dauUsers: number;
  wauUsers: number;
  mauUsers: number;
  wauMauRatio: number | null;
  dauDeltaPct: number | null;
  wauDeltaPct: number | null;
  mauDeltaPct: number | null;
  activeUsers30d: number;
  activeUsers30dDeltaPct: number | null;
  activeGuilds30d: number;
  activeGuilds30dDeltaPct: number | null;
}

interface AdminDashboardSectionProps {
  stats: AdminStats | null;
  loading: boolean;
  isAdmin: boolean;
  onNavigateToSection: (section: AdminSection) => void;
}

export const AdminDashboardSection = ({
  stats,
  loading,
  isAdmin,
  onNavigateToSection,
}: AdminDashboardSectionProps) => {
  const { t } = useLanguage();
  const countFormatter = new Intl.NumberFormat();
  const formatCount = (value: number | null | undefined) =>
    value === null || value === undefined ? '-' : countFormatter.format(value);

  const statMap = {
    activeUsers30d: {
      label: t.admin.stats.activeUsers30d,
      value: formatCount(stats?.activeUsers30d),
      icon: Users,
      color: 'text-status-info',
      tooltip: t.admin.stats.activeUsers30dTooltip,
      deltaPct: stats?.activeUsers30dDeltaPct ?? null,
    },
    activeGuilds30d: {
      label: t.admin.stats.activeGuilds30d,
      value: formatCount(stats?.activeGuilds30d),
      icon: Shield,
      color: 'text-status-success',
      tooltip: t.admin.stats.activeGuilds30dTooltip,
      deltaPct: stats?.activeGuilds30dDeltaPct ?? null,
    },
    dauUsers: {
      label: t.admin.stats.dauUsers,
      value: formatCount(stats?.dauUsers),
      icon: Activity,
      color: 'text-status-info',
      tooltip: t.admin.stats.dauUsersTooltip,
      deltaPct: stats?.dauDeltaPct ?? null,
    },
    wauUsers: {
      label: t.admin.stats.wauUsers,
      value: formatCount(stats?.wauUsers),
      icon: Activity,
      color: 'text-status-info',
      tooltip: t.admin.stats.wauUsersTooltip,
      deltaPct: stats?.wauDeltaPct ?? null,
    },
    mauUsers: {
      label: t.admin.stats.mauUsers,
      value: formatCount(stats?.mauUsers),
      icon: Activity,
      color: 'text-primary',
      tooltip: t.admin.stats.mauUsersTooltip,
      deltaPct: stats?.mauDeltaPct ?? null,
    },
    guildsWithTwoMembers: {
      label: t.admin.stats.guildsWithTwoMembers,
      value: formatCount(stats?.guildsWithTwoMembers),
      icon: Users,
      color: 'text-status-info',
      tooltip: t.admin.stats.guildsWithTwoMembersTooltip,
    },
    uniqueWishUsers: {
      label: t.admin.stats.uniqueWishUsers,
      value: formatCount(stats?.uniqueWishUsers),
      icon: Sparkles,
      color: 'text-primary',
      tooltip: t.admin.stats.uniqueWishUsersTooltip,
    },
    totalWishes: {
      label: t.admin.stats.totalWishes,
      value: formatCount(stats?.totalWishes),
      icon: Sparkles,
      color: 'text-primary/70',
      tooltip: t.admin.stats.totalWishesTooltip,
    },
    guildsWithWishes: {
      label: t.admin.stats.guildsWithWishes,
      value: formatCount(stats?.guildsWithWishes),
      icon: Shield,
      color: 'text-primary/50',
      tooltip: t.admin.stats.guildsWithWishesTooltip,
    },
    engagementRate: {
      label: t.admin.stats.engagementRate,
      value: formatPercentValue(stats?.wauMauRatio, 1),
      icon: Sparkles,
      color: 'text-status-warning',
      tooltip: t.admin.stats.engagementRateTooltip,
    },
    guildEngagementRate: {
      label: t.admin.stats.guildEngagementRate,
      value: formatPercentValue(stats?.guildEngagementRate, 0),
      icon: Shield,
      color: 'text-status-warning',
      tooltip: t.admin.stats.guildEngagementRateTooltip,
    },
    guildsWithTwoWishUsers: {
      label: t.admin.stats.guildsWithTwoWishUsers,
      value: formatCount(stats?.guildsWithTwoWishUsers),
      icon: Sparkles,
      color: 'text-status-warning',
      tooltip: t.admin.stats.guildsWithTwoWishUsersTooltip,
    },
    topics: {
      label: t.admin.stats.topics,
      value: formatCount(stats?.totalTopics),
      icon: MessageSquare,
      color: 'text-primary',
      tooltip: t.admin.stats.topicsTooltip,
    },
    posts: {
      label: t.admin.stats.posts,
      value: formatCount(stats?.totalPosts),
      icon: MessageSquare,
      color: 'text-status-info',
      tooltip: t.admin.stats.postsTooltip,
    },
    pendingReports: {
      label: t.admin.stats.pendingReports,
      value: formatCount(stats?.pendingReports),
      icon: AlertTriangle,
      color: stats?.pendingReports && stats.pendingReports > 0 ? 'text-status-warning' : 'text-muted-foreground',
      tooltip: t.admin.stats.pendingReportsTooltip,
    },
    activeSanctions: {
      label: t.admin.stats.activeSanctions,
      value: formatCount(stats?.activeSanctions),
      icon: AlertTriangle,
      color: stats?.activeSanctions && stats.activeSanctions > 0 ? 'text-status-error' : 'text-muted-foreground',
      tooltip: t.admin.stats.activeSanctionsTooltip,
    },
    openBugs: {
      label: t.admin.stats.openBugs,
      value: formatCount(stats?.openBugs),
      icon: Bug,
      color: stats?.openBugs && stats.openBugs > 0 ? 'text-status-error' : 'text-muted-foreground',
      tooltip: t.admin.stats.openBugsTooltip,
    },
    pendingDeletions: {
      label: t.admin.stats.pendingDeletions,
      value: formatCount(stats?.pendingDeletions),
      icon: Trash2,
      color: stats?.pendingDeletions && stats.pendingDeletions > 0 ? 'text-status-error' : 'text-muted-foreground',
      tooltip: t.admin.stats.pendingDeletionsTooltip,
    },
    totalPolls: {
      label: t.admin.stats.totalPolls,
      value: formatCount(stats?.totalPolls),
      icon: ClipboardList,
      color: 'text-status-info',
      tooltip: t.admin.stats.totalPollsTooltip,
    },
    activePolls: {
      label: t.admin.stats.activePolls,
      value: formatCount(stats?.activePolls),
      icon: PlayCircle,
      color: 'text-status-success',
      tooltip: t.admin.stats.activePollsTooltip,
    },
    closedPolls: {
      label: t.admin.stats.closedPolls,
      value: formatCount(stats?.closedPolls),
      icon: CheckCircle2,
      color: 'text-status-success',
      tooltip: t.admin.stats.closedPollsTooltip,
    },
    pollVoters: {
      label: t.admin.stats.pollVoters,
      value: formatCount(stats?.pollVoters),
      icon: BarChart2,
      color: 'text-status-info',
      tooltip: t.admin.stats.pollVotersTooltip,
    },
  } as const;

  const statGroups: Array<{ title: string; stats: Array<keyof typeof statMap> }> = [
    {
      title: t.admin.stats.groupCommunity,
      stats: ['activeUsers30d', 'activeGuilds30d', 'guildsWithTwoMembers', 'engagementRate'],
    },
    {
      title: t.admin.stats.groupActivation,
      stats: ['dauUsers', 'wauUsers', 'mauUsers'],
    },
    {
      title: t.admin.stats.groupWishes,
      stats: [
        'uniqueWishUsers',
        'totalWishes',
        'guildsWithWishes',
        'guildEngagementRate',
        'guildsWithTwoWishUsers',
      ],
    },
    {
      title: t.admin.stats.groupForum,
      stats: ['topics', 'posts'],
    },
    {
      title: t.admin.stats.groupModeration,
      stats: ['pendingReports', 'activeSanctions', 'openBugs', 'pendingDeletions'],
    },
    {
      title: t.admin.stats.groupPolls,
      stats: ['totalPolls', 'activePolls', 'closedPolls', 'pollVoters'],
    },
  ];

  const adminSections = [
    {
      title: t.admin?.forumAdmin,
      description: t.admin.stats.forumAdminDesc,
      icon: MessageSquare,
      onClick: () => onNavigateToSection('forum'),
      color: 'text-primary',
      allowsModerator: true,
    },
    {
      title: t.admin?.userManagement,
      description: t.admin?.userManagementDesc,
      icon: Users,
      onClick: () => onNavigateToSection('users'),
      color: 'text-status-info',
      requiresAdmin: true,
    },
    {
      title: t.admin?.guildManagement,
      description: t.admin?.guildManagementDesc,
      icon: Shield,
      onClick: () => onNavigateToSection('guilds'),
      color: 'text-status-success',
      requiresAdmin: true,
    },
    {
      title: t.admin?.legalPages,
      description: t.admin?.legalPagesDesc,
      icon: FileText,
      onClick: () => onNavigateToSection('legal'),
      color: 'text-status-warning',
      requiresAdmin: true,
    },
    {
      title: t.admin?.deletionRequests,
      description: t.admin?.deletionRequestsDesc,
      icon: Trash2,
      onClick: () => onNavigateToSection('deletions'),
      color: 'text-status-error',
      requiresAdmin: true,
    },
    {
      title: t.admin?.bugReports,
      description: t.admin?.bugReportsDesc,
      icon: Bug,
      onClick: () => onNavigateToSection('bugs'),
      color: 'text-status-error',
      allowsModerator: true,
    },
  ];

  const visibleSections = adminSections.filter(section => {
    if (isAdmin) return true;
    return section.allowsModerator;
  });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <TooltipProvider delayDuration={150}>
        <div className="space-y-5">
          {statGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {group.title}
                </h3>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {group.stats.map((statKey) => {
                  const stat = statMap[statKey];
                  const hasDelta = 'deltaPct' in stat;
                  const deltaValue = 'deltaPct' in stat ? stat.deltaPct : null;
                  const deltaText = formatSignedPercentDelta(deltaValue);
                  return (
                    <GlowCard key={statKey} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="truncate">{stat.label}</span>
                            {stat.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={stat.label}
                                    className="inline-flex items-center rounded-sm bg-transparent p-0 text-muted-foreground/70 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[220px] text-xs">
                                  {stat.tooltip}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <span className="text-2xl font-bold text-foreground mt-1 block">
                            {loading ? <Skeleton className="h-8 w-12" /> : stat.value}
                          </span>
                          {!loading && hasDelta && (
                            <span
                              className={`mt-1 block text-[11px] font-medium ${getDeltaColorClass(deltaValue)}`}
                            >
                              {deltaText
                                ? `${deltaText} ${t.admin.stats.vsPreviousPeriod}`
                                : t.admin.stats.deltaNoBaseline}
                            </span>
                          )}
                        </div>
                        <stat.icon className={`h-5 w-5 ${stat.color} mt-0.5`} />
                      </div>
                    </GlowCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </TooltipProvider>

      {/* Admin Sections */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">
          {t.admin?.quickAccess}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleSections.map((section, index) => (
            <GlowCard 
              key={index} 
              className="p-5 cursor-pointer hover:ring-primary/50 transition-all"
              onClick={section.onClick}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-card ${section.color}`}>
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{section.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </div>
  );
};


