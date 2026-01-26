import { useLanguage } from '@/contexts/LanguageContext';
import { GlowCard } from '@/components/GlowCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
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

  const statMap = {
    users: {
      label: t.admin.stats.users,
      value: stats?.totalUsers ?? '-',
      icon: Users,
      color: 'text-blue-400',
      tooltip: t.admin.stats.usersTooltip,
    },
    guilds: {
      label: t.admin.stats.guilds,
      value: stats?.totalGuilds ?? '-',
      icon: Shield,
      color: 'text-green-400',
      tooltip: t.admin.stats.guildsTooltip,
    },
    guildsWithTwoMembers: {
      label: t.admin.stats.guildsWithTwoMembers,
      value: stats?.guildsWithTwoMembers ?? '-',
      icon: Users,
      color: 'text-sky-300',
      tooltip: t.admin.stats.guildsWithTwoMembersTooltip,
    },
    uniqueWishUsers: {
      label: t.admin.stats.uniqueWishUsers,
      value: stats?.uniqueWishUsers ?? '-',
      icon: Sparkles,
      color: 'text-primary',
      tooltip: t.admin.stats.uniqueWishUsersTooltip,
    },
    totalWishes: {
      label: t.admin.stats.totalWishes,
      value: stats?.totalWishes ?? '-',
      icon: Sparkles,
      color: 'text-primary/70',
      tooltip: t.admin.stats.totalWishesTooltip,
    },
    guildsWithWishes: {
      label: t.admin.stats.guildsWithWishes,
      value: stats?.guildsWithWishes ?? '-',
      icon: Shield,
      color: 'text-primary/50',
      tooltip: t.admin.stats.guildsWithWishesTooltip,
    },
    engagementRate: {
      label: t.admin.stats.engagementRate,
      value: stats && stats.totalUsers > 0
        ? `${Math.round((stats.uniqueWishUsers / stats.totalUsers) * 100)}%`
        : '-',
      icon: Sparkles,
      color: 'text-amber-400',
      tooltip: t.admin.stats.engagementRateTooltip,
    },
    guildEngagementRate: {
      label: t.admin.stats.guildEngagementRate,
      value: stats ? `${stats.guildEngagementRate}%` : '-',
      icon: Shield,
      color: 'text-amber-300',
      tooltip: t.admin.stats.guildEngagementRateTooltip,
    },
    guildsWithTwoWishUsers: {
      label: t.admin.stats.guildsWithTwoWishUsers,
      value: stats?.guildsWithTwoWishUsers ?? '-',
      icon: Sparkles,
      color: 'text-amber-200',
      tooltip: t.admin.stats.guildsWithTwoWishUsersTooltip,
    },
    topics: {
      label: t.admin.stats.topics,
      value: stats?.totalTopics ?? '-',
      icon: MessageSquare,
      color: 'text-purple-400',
      tooltip: t.admin.stats.topicsTooltip,
    },
    posts: {
      label: t.admin.stats.posts,
      value: stats?.totalPosts ?? '-',
      icon: MessageSquare,
      color: 'text-indigo-400',
      tooltip: t.admin.stats.postsTooltip,
    },
    pendingReports: {
      label: t.admin.stats.pendingReports,
      value: stats?.pendingReports ?? '-',
      icon: AlertTriangle,
      color: stats?.pendingReports && stats.pendingReports > 0 ? 'text-amber-400' : 'text-muted-foreground',
      tooltip: t.admin.stats.pendingReportsTooltip,
    },
    activeSanctions: {
      label: t.admin.stats.activeSanctions,
      value: stats?.activeSanctions ?? '-',
      icon: AlertTriangle,
      color: stats?.activeSanctions && stats.activeSanctions > 0 ? 'text-red-400' : 'text-muted-foreground',
      tooltip: t.admin.stats.activeSanctionsTooltip,
    },
    openBugs: {
      label: t.admin.stats.openBugs,
      value: stats?.openBugs ?? '-',
      icon: Bug,
      color: stats?.openBugs && stats.openBugs > 0 ? 'text-red-400' : 'text-muted-foreground',
      tooltip: t.admin.stats.openBugsTooltip,
    },
    pendingDeletions: {
      label: t.admin.stats.pendingDeletions,
      value: stats?.pendingDeletions ?? '-',
      icon: Trash2,
      color: stats?.pendingDeletions && stats.pendingDeletions > 0 ? 'text-red-400' : 'text-muted-foreground',
      tooltip: t.admin.stats.pendingDeletionsTooltip,
    },
    totalPolls: {
      label: t.admin.stats.totalPolls,
      value: stats?.totalPolls ?? '-',
      icon: ClipboardList,
      color: 'text-sky-400',
      tooltip: t.admin.stats.totalPollsTooltip,
    },
    activePolls: {
      label: t.admin.stats.activePolls,
      value: stats?.activePolls ?? '-',
      icon: PlayCircle,
      color: 'text-emerald-400',
      tooltip: t.admin.stats.activePollsTooltip,
    },
    closedPolls: {
      label: t.admin.stats.closedPolls,
      value: stats?.closedPolls ?? '-',
      icon: CheckCircle2,
      color: 'text-teal-400',
      tooltip: t.admin.stats.closedPollsTooltip,
    },
    pollVoters: {
      label: t.admin.stats.pollVoters,
      value: stats?.pollVoters ?? '-',
      icon: BarChart2,
      color: 'text-cyan-400',
      tooltip: t.admin.stats.pollVotersTooltip,
    },
  } as const;

  const statGroups: Array<{ title: string; stats: Array<keyof typeof statMap> }> = [
    {
      title: t.admin.stats.groupCommunity,
      stats: ['users', 'guilds', 'guildsWithTwoMembers'],
    },
    {
      title: t.admin.stats.groupWishes,
      stats: [
        'uniqueWishUsers',
        'totalWishes',
        'guildsWithWishes',
        'engagementRate',
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
      color: 'text-purple-400',
      allowsModerator: true,
    },
    {
      title: t.admin?.userManagement,
      description: t.admin?.userManagementDesc,
      icon: Users,
      onClick: () => onNavigateToSection('users'),
      color: 'text-blue-400',
      requiresAdmin: true,
    },
    {
      title: t.admin?.guildManagement,
      description: t.admin?.guildManagementDesc,
      icon: Shield,
      onClick: () => onNavigateToSection('guilds'),
      color: 'text-green-400',
      requiresAdmin: true,
    },
    {
      title: t.admin?.legalPages,
      description: t.admin?.legalPagesDesc,
      icon: FileText,
      onClick: () => onNavigateToSection('legal'),
      color: 'text-amber-400',
      requiresAdmin: true,
    },
    {
      title: t.admin?.deletionRequests,
      description: t.admin?.deletionRequestsDesc,
      icon: Trash2,
      onClick: () => onNavigateToSection('deletions'),
      color: 'text-red-400',
      requiresAdmin: true,
    },
    {
      title: t.admin?.bugReports,
      description: t.admin?.bugReportsDesc,
      icon: Bug,
      onClick: () => onNavigateToSection('bugs'),
      color: 'text-red-400',
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
                                    className="inline-flex items-center bg-transparent p-0 text-muted-foreground/70 hover:text-foreground transition focus:outline-none"
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
