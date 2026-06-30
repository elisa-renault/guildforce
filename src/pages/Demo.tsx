import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Crosshair,
  Crown,
  Download,
  Heart,
  History,
  Lock,
  MessageSquare,
  MoreVertical,
  Pencil,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Star,
  Swords,
  Table as TableIcon,
  Unlock,
  UserCog,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type {
  MemberWish,
  RosterFilters as RosterFiltersType,
  RosterSelectionStatus,
  ValidationStatus,
  WishData,
} from '@/types/guild';
import type { GuildPoll, ResponseValue } from '@/types/poll';
import type { GuildSeason } from '@/types/seasons';

import { CosmicButton } from '@/components/CosmicButton';
import {
  RosterAnalytics,
  RosterFilters,
  RosterSelectedTable,
  RosterTable,
  WishValidationBadge,
  type RosterTableColumnId,
} from '@/components/dashboard';
import { RosterDecisionToggle } from '@/components/dashboard/RosterDecisionToggle';
import { GlowCard } from '@/components/GlowCard';
import { GuildWorkspaceShell, type GuildWorkspaceTab } from '@/components/guild';
import { ContextualToolbar } from '@/components/layout/ContextualToolbar';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { PollResponse, PollResults } from '@/components/polls';
import { RosterSelector } from '@/components/roster';
import { SeasonSelector, SeasonStateCallout } from '@/components/seasons/SeasonSelector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterBar, FilterSearchField, activeFilterControlClassName, filterControlClassName } from '@/components/ui/filter-controls';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { BATTLENET_CLASS_MAP } from '@/data/battlenetClasses';
import {
  getClassById,
  getLocalizedClassName,
  getLocalizedSpecName,
  getRolesFromSpecs,
  getSpecById,
  wowClasses,
  type Role,
  type Specialization,
} from '@/data/wowClasses';
import { demoMemberRankLabels, demoRosterMembers, type DemoRosterMember } from '@/demo/demoMembers';
import {
  applyDemoPollSubmissions,
  buildDemoPolls,
  type DemoPollSubmission,
} from '@/demo/demoPolls';
import {
  demoAnalyticsMetadata,
  demoGuild,
  demoMembers,
  demoRoster,
  demoRosters,
  demoSeasons,
} from '@/demo/demoRoster';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { formatDateTimeLocalized, formatLabelValue, interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage } from '@/i18n/semantic';
import { commitmentBadgeClass, toneTextClass, wowClassColorValue } from '@/lib/design-tokens';
import { capturePostHogProductEvent } from '@/lib/productEvents';
import { formatRankLabel } from '@/lib/rankLabel';
import { formatRealmDisplayName } from '@/lib/realms';
import { getSelectedValidatedMembers } from '@/lib/selectedValidatedMembers';
import { cn } from '@/lib/utils';
import { resolveWishLockState } from '@/lib/wishLock';

type DemoView = 'roster' | 'analytics' | 'polls' | 'poll-detail' | 'poll-results' | 'members' | 'settings' | 'member';
type RosterTab = 'table' | 'selected' | 'analytics';
type MemberSortColumn = 'character' | 'realm' | 'level' | 'class' | 'player' | 'rank' | 'guildforce';
type SortDirection = 'asc' | 'desc';

const MEMBERS_PER_PAGE = 20;
const DEMO_OFFICER_RANK_THRESHOLD = 4;

const DEFAULT_ROSTER_TABLE_COLUMNS: RosterTableColumnId[] = [
  'status',
  'rosterDecision',
  'wishesCount',
  'wish1',
  'wish2',
  'wish3',
];

const createDefaultFilters = (): RosterFiltersType => ({
  roleFilters: [],
  classFilters: [],
  rosterMemberFilters: null,
  validationFilters: [],
  rosterDecisionFilters: [],
  searchQuery: '',
  filterMode: 'or',
  commitmentFilters: [],
  minWishes: null,
  rangeFilters: [],
  hasComment: null,
  maxWishIndex: null,
});

const replaceCount = (template: string, count: number) =>
  template.replace('{{count}}', String(count)).replace('{{days}}', String(count));

const replaceTemplateValues = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (current, [key, value]) => current.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
    template,
  );

const resolveDemoView = (pathname: string): DemoView => {
  if (/\/demo\/member\/[^/]+$/.test(pathname)) return 'member';
  if (/\/demo\/poll\/[^/]+\/results$/.test(pathname)) return 'poll-results';
  if (/\/demo\/poll\/[^/]+$/.test(pathname)) return 'poll-detail';
  if (pathname.endsWith('/polls')) return 'polls';
  if (pathname.endsWith('/members')) return 'members';
  if (pathname.endsWith('/settings')) return 'settings';
  if (pathname.endsWith('/analytics')) return 'analytics';
  return 'roster';
};

const toWorkspaceTab = (view: DemoView): GuildWorkspaceTab => {
  if (view === 'polls' || view === 'poll-detail' || view === 'poll-results') return 'polls';
  if (view === 'members') return 'members';
  if (view === 'settings') return 'settings';
  return 'roster';
};

const resolveDemoMemberId = (pathname: string) => {
  const match = pathname.match(/\/demo\/member\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
};

const resolveDemoPollId = (pathname: string) => {
  const match = pathname.match(/\/demo\/poll\/([^/]+)(?:\/results)?$/);
  return match ? decodeURIComponent(match[1]) : null;
};

const getLockDateIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  date.setHours(20, 0, 0, 0);
  return date.toISOString();
};

const getSpecIcon = (spec: Specialization) => {
  if (spec.role === 'tank') return Shield;
  if (spec.role === 'healer') return Heart;
  return spec.range === 'ranged' ? Crosshair : Swords;
};

const detailRoleConfig: Record<string, { color: string }> = {
  tank: { color: 'text-tank' },
  healer: { color: 'text-healer' },
  dps: { color: 'text-dps' },
};

const getWishesToConsider = (member: MemberWish, filters: RosterFiltersType) =>
  filters.maxWishIndex
    ? member.wishes.filter((wish) => wish.choice_index <= filters.maxWishIndex!)
    : member.wishes;

const matchesRosterMemberFilter = (member: MemberWish, filters: RosterFiltersType) =>
  filters.rosterMemberFilters === null || filters.rosterMemberFilters.includes(member.id);

const matchesSearchFilter = (member: MemberWish, filters: RosterFiltersType) =>
  !filters.searchQuery || member.username.toLowerCase().includes(filters.searchQuery.toLowerCase());

const matchesCommitmentFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.commitmentFilters.length === 0) return true;

  const statusMap: Record<string, 'confirmed' | 'undecided' | 'withdrawn'> = {
    confirmed: 'confirmed',
    potential: 'undecided',
    withdrawn: 'withdrawn',
  };
  return filters.commitmentFilters.includes(statusMap[member.status] || 'undecided');
};

const matchesRosterDecisionFilter = (member: MemberWish, filters: RosterFiltersType) =>
  filters.rosterDecisionFilters.length === 0
  || filters.rosterDecisionFilters.includes(member.selectionStatus || 'undecided');

const matchesWishCountFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.minWishes === null) return true;

  const wishCount = getWishesToConsider(member, filters).filter((wish) => wish.class_id).length;
  return filters.minWishes === 0 ? wishCount === 0 : wishCount >= filters.minWishes;
};

const matchesRangeFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.rangeFilters.length === 0) return true;

  return getWishesToConsider(member, filters).some((wish) =>
    wish.spec_ids?.some((specId) => {
      const spec = getSpecById(specId);
      return spec && filters.rangeFilters.includes(spec.range);
    }),
  );
};

const matchesCommentFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.hasComment === null) return true;

  const hasAnyComment = getWishesToConsider(member, filters).some((wish) => wish.comment?.trim());
  return filters.hasComment === hasAnyComment;
};

const matchesRoleFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.roleFilters.length === 0) return true;

  const wishesToConsider = getWishesToConsider(member, filters);
  if (filters.filterMode === 'and') {
    return filters.roleFilters.every((role) =>
      wishesToConsider.some((wish) => getRolesFromSpecs(wish.spec_ids).includes(role as Role)),
    );
  }

  return wishesToConsider.some((wish) => {
    const roles = getRolesFromSpecs(wish.spec_ids);
    return filters.roleFilters.some((role) => roles.includes(role as Role));
  });
};

const matchesClassFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.classFilters.length === 0) return true;

  const wishesToConsider = getWishesToConsider(member, filters);
  if (filters.filterMode === 'and') {
    return filters.classFilters.every((classId) =>
      wishesToConsider.some((wish) => wish.class_id === classId),
    );
  }

  return wishesToConsider.some((wish) => filters.classFilters.includes(wish.class_id));
};

const matchesValidationFilter = (member: MemberWish, filters: RosterFiltersType) => {
  if (filters.validationFilters.length === 0) return true;

  const wishesToConsider = getWishesToConsider(member, filters);
  if (filters.filterMode === 'and') {
    return filters.validationFilters.every((status) =>
      wishesToConsider.some((wish) => (wish.validation_status || 'pending') === status),
    );
  }

  return wishesToConsider.some((wish) =>
    filters.validationFilters.includes((wish.validation_status || 'pending') as ValidationStatus),
  );
};

const filterMembers = (members: MemberWish[], filters: RosterFiltersType) =>
  members.filter((member) =>
    matchesRosterMemberFilter(member, filters)
    && matchesSearchFilter(member, filters)
    && matchesCommitmentFilter(member, filters)
    && matchesRosterDecisionFilter(member, filters)
    && matchesWishCountFilter(member, filters)
    && matchesRangeFilter(member, filters)
    && matchesCommentFilter(member, filters)
    && matchesRoleFilter(member, filters)
    && matchesClassFilter(member, filters)
    && matchesValidationFilter(member, filters),
  );

const Demo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<MemberWish[]>(demoMembers);
  const [filters, setFilters] = useState<RosterFiltersType>(() => createDefaultFilters());
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(demoRoster.id);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(demoRoster.seasonId);
  const [activeRosterTab, setActiveRosterTab] = useState<RosterTab>('table');
  const [demoPollSubmissions, setDemoPollSubmissions] = useState<DemoPollSubmission>({});
  const view = resolveDemoView(location.pathname);
  const memberDetailId = resolveDemoMemberId(location.pathname);
  const pollDetailId = resolveDemoPollId(location.pathname);
  const lockAtIso = useMemo(() => getLockDateIso(), []);
  const baseDemoPolls = useMemo(() => buildDemoPolls(t), [t]);
  const demoPolls = useMemo(
    () => applyDemoPollSubmissions(baseDemoPolls, demoPollSubmissions),
    [baseDemoPolls, demoPollSubmissions],
  );
  const detailPoll = pollDetailId ? demoPolls.find((poll) => poll.id === pollDetailId) || null : null;

  const rosters = useMemo(
    () =>
      demoRosters.map((roster) =>
        roster.id === demoRoster.id
          ? { ...roster, wishes_lock_at: lockAtIso }
          : roster,
      ),
    [lockAtIso],
  );
  const currentRoster = rosters.find((roster) => roster.id === selectedRosterId) || rosters[0];
  const selectedSeason = demoSeasons.find((season) => season.id === selectedSeasonId) || null;
  const detailMember = view === 'member'
    ? members.find((member) => member.id === memberDetailId) || null
    : null;
  const rosterLockState = resolveWishLockState({
    rosterLocked: currentRoster?.wishes_locked,
    rosterLockAt: currentRoster?.wishes_lock_at,
    memberLocked: false,
  });
  const rosterScheduledLabel =
    rosterLockState.isScheduled && rosterLockState.scheduledAt
      ? formatDateTimeLocalized(rosterLockState.scheduledAt, language, { dateStyle: 'medium', timeStyle: 'short' })
      : null;
  const rosterLockLabel = rosterLockState.isLocked
    ? formatLabelValue(t.wishes.lockedTitle, t.wishes.lockedRosterDesc, language)
    : rosterScheduledLabel
      ? interpolateMessage(t.wishes.lockScheduledDesc, { date: rosterScheduledLabel })
      : null;

  useEffect(() => {
    capturePostHogProductEvent('demo_started', {
      source: 'public_demo_workspace',
      feature_area: 'rosters',
    });
  }, []);

  useEffect(() => {
    if (view === 'analytics') {
      setActiveRosterTab('analytics');
    }
  }, [view]);

  useEffect(() => {
    setDemoPollSubmissions({});
  }, [language]);

  useEffect(() => {
    if (view === 'roster' || view === 'analytics' || view === 'member') {
      capturePostHogProductEvent('demo_viewed_roster', {
        source: 'public_demo_workspace',
        feature_area: 'rosters',
      });
    }
  }, [view]);

  useEffect(() => {
    if (activeRosterTab === 'analytics') {
      capturePostHogProductEvent('demo_viewed_analytics', {
        source: 'public_demo_workspace',
        feature_area: 'rosters',
      });
    }
  }, [activeRosterTab]);

  const showDemoActionToast = () => {
    capturePostHogProductEvent('demo_clicked_fake_action', {
      source: 'public_demo_workspace',
      feature_area: 'rosters',
    });
    toast({
      title: t.demo.actionToastTitle,
      description: t.demo.actionToastDescription,
    });
  };

  const handleSubmitDemoPollResponses = async (
    pollId: string,
    responses: { questionId: string; value: ResponseValue }[],
  ) => {
    setDemoPollSubmissions((current) => ({
      ...current,
      [pollId]: responses,
    }));
    capturePostHogProductEvent('demo_poll_response_saved', {
      source: 'public_demo_workspace',
      feature_area: 'polls',
      poll_id: pollId,
    });
    toast({
      title: t.demo.pollsUi.responseSavedTitle,
      description: t.demo.pollsUi.responseSavedDescription,
    });
    navigate(`/demo/poll/${encodeURIComponent(pollId)}/results`);
  };

  const handleValidateWish = (memberId: string, choiceIndex: number, status: ValidationStatus) => {
    showDemoActionToast();
    setMembers((current) =>
      current.map((member) => {
        if (member.id !== memberId) return member;
        return {
          ...member,
          wishes: member.wishes.map((wish) =>
            wish.choice_index === choiceIndex
              ? {
                  ...wish,
                  validation_status: status,
                  validated_by_username: status === 'pending' ? null : 'Demo officer',
                  validated_at: status === 'pending' ? null : new Date().toISOString(),
                }
              : wish,
          ),
        };
      }),
    );
  };

  const handleSelectionChange = (memberId: string, selectionStatus: RosterSelectionStatus) => {
    showDemoActionToast();
    setMembers((current) =>
      current.map((member) => member.id === memberId ? { ...member, selectionStatus } : member),
    );
  };

  const handleToggleMemberLock = (memberId: string, locked: boolean) => {
    showDemoActionToast();
    setMembers((current) =>
      current.map((member) => member.id === memberId ? { ...member, wishes_locked: locked } : member),
    );
  };

  const getRosterQuery = () => {
    const params = new URLSearchParams(location.search);
    if (!params.get('rosterId') && selectedRosterId) params.set('rosterId', selectedRosterId);
    if (!params.get('seasonId') && selectedSeasonId) params.set('seasonId', selectedSeasonId);
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  const handleOpenMemberWishes = (member: MemberWish) => {
    navigate(`/demo/member/${encodeURIComponent(member.id)}${getRosterQuery()}`);
  };

  const handleBackToRoster = () => {
    navigate(`/demo/roster${getRosterQuery()}`);
  };

  const handleRosterSelect = (rosterId: string) => {
    setSelectedRosterId(rosterId);
    setActiveRosterTab('table');
  };

  const handleSeasonSelect = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
  };

  const renderLockIndicator = () => {
    if (!rosterLockLabel) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                rosterLockState.isLocked ? toneTextClass('warning') : toneTextClass('info'),
              )}
              aria-label={rosterLockLabel}
            >
              {rosterLockState.isLocked ? <Lock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              <span className="sr-only">{rosterLockLabel}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{rosterLockLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderToolbarActionsMenu = () => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <CosmicButton
          size="sm"
          variant="outline"
          icon={<MoreVertical className="h-4 w-4" strokeWidth={1.5} />}
          className="h-8 w-8 p-0"
          aria-label={t.common.actions}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-border bg-card">
        <DropdownMenuItem onClick={showDemoActionToast} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          {t.seasons.settingsTitle}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={showDemoActionToast} className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          {t.dashboard.exportCSV}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={showDemoActionToast} className="cursor-pointer">
          <UserPlus className="mr-2 h-4 w-4" />
          {t.dashboard.externalMember.addButton}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={showDemoActionToast} className="cursor-pointer">
          <Lock className="mr-2 h-4 w-4" />
          {t.rosters.wishesLockTitle}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={showDemoActionToast} className="cursor-pointer">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t.wishes.memberDetail.historyEvent.syncDeltaApplied}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={showDemoActionToast} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          {t.dashboard.roster}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const showRosterToolbar = view === 'roster' || view === 'analytics';
  const workspaceToolbar = (
    <>
      {showRosterToolbar && (
        <PageContainer className="py-2" width="workspace">
          <ContextualToolbar
            className={cn('border-0 bg-transparent p-0 shadow-none backdrop-blur-0', isMobile && 'gap-2 overflow-hidden')}
            leading={(
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <RosterSelector
                  rosters={rosters}
                  selectedRosterId={selectedRosterId}
                  onSelect={handleRosterSelect}
                  showAccessIndicator
                />
                <SeasonSelector
                  seasons={demoSeasons}
                  selectedSeasonId={selectedSeasonId}
                  onSelect={handleSeasonSelect}
                />
              </div>
            )}
            trailing={(
              <>
                {renderLockIndicator()}
                <CosmicButton
                  size="sm"
                  onClick={showDemoActionToast}
                  disabled={selectedSeason?.state !== 'active'}
                  icon={<Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.5} />}
                  className="h-8 flex-1 justify-center px-3 md:w-auto"
                >
                  <span className="md:inline">{t.wishes.editMyWishes}</span>
                </CosmicButton>
                {renderToolbarActionsMenu()}
              </>
            )}
          />
        </PageContainer>
      )}
      {view === 'member' && (
        <PageContainer className="py-2" width="workspace">
          <ContextualToolbar
            className={cn('border-0 bg-transparent p-0 shadow-none backdrop-blur-0', isMobile && 'gap-2 overflow-hidden')}
            leading={(
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 border-border/45 bg-card/55"
                  onClick={handleBackToRoster}
                  aria-label={t.common.back}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {detailMember?.username ?? t.dashboard.noData}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[detailMember?.mainCharacterName, detailMember?.realmName].filter(Boolean).join(' - ')}
                  </div>
                </div>
              </div>
            )}
            trailing={(
              <>
                <SeasonSelector
                  seasons={demoSeasons}
                  selectedSeasonId={selectedSeasonId}
                  onSelect={handleSeasonSelect}
                />
                <CosmicButton
                  size="sm"
                  variant="outline"
                  icon={<Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  onClick={showDemoActionToast}
                  className="h-8"
                >
                  {t.common.edit}
                </CosmicButton>
                <CosmicButton
                  size="sm"
                  variant="outline"
                  icon={detailMember?.wishes_locked ? <Unlock className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  onClick={() => detailMember ? handleToggleMemberLock(detailMember.id, !detailMember.wishes_locked) : showDemoActionToast()}
                  className="h-8"
                >
                  {detailMember?.wishes_locked ? t.wishes.unlockMember : t.wishes.lockMember}
                </CosmicButton>
              </>
            )}
          />
        </PageContainer>
      )}
    </>
  );

  return (
    <GuildWorkspaceShell
      guild={{ name: demoGuild.name, server: demoGuild.server, region: demoGuild.region }}
      guildId={null}
      basePath="/demo"
      isGM
      hasSettingsPermission
      hasVaultAccess={false}
      activeTab={toWorkspaceTab(view)}
      toolbar={workspaceToolbar}
      visibleTabs={['roster', 'members']}
    >
      <PageContainer as="main" width="workspace" className="relative z-10 py-3 md:py-4">
        {(view === 'roster' || view === 'analytics') && (
          <DemoRosterWorkspace
            members={members}
            filters={filters}
            setFilters={setFilters}
            selectedRosterId={selectedRosterId}
            selectedSeasonId={selectedSeasonId}
            selectedSeason={selectedSeason}
            activeTab={activeRosterTab}
            setActiveTab={setActiveRosterTab}
            onFakeAction={showDemoActionToast}
            onValidateWish={handleValidateWish}
            onSelectionChange={handleSelectionChange}
            onToggleMemberLock={handleToggleMemberLock}
            onOpenMemberWishes={handleOpenMemberWishes}
          />
        )}

        {view === 'member' && (
          <DemoMemberWishes
            member={detailMember}
            selectedSeason={selectedSeason}
            onBack={handleBackToRoster}
            onValidateWish={handleValidateWish}
            onSelectionChange={handleSelectionChange}
          />
        )}

        {view === 'polls' && <DemoPolls polls={demoPolls} onFakeAction={showDemoActionToast} />}
        {view === 'poll-detail' && (
          <DemoPollDetail
            poll={detailPoll}
            onFakeAction={showDemoActionToast}
            onSubmit={handleSubmitDemoPollResponses}
          />
        )}
        {view === 'poll-results' && <DemoPollResults poll={detailPoll} />}
        {view === 'members' && <DemoMembers onFakeAction={showDemoActionToast} />}
        {view === 'settings' && <DemoSettings lockDays={5} />}
      </PageContainer>
    </GuildWorkspaceShell>
  );
};

const DemoRosterWorkspace = ({
  members,
  filters,
  setFilters,
  selectedRosterId,
  selectedSeasonId,
  selectedSeason,
  activeTab,
  setActiveTab,
  onFakeAction,
  onValidateWish,
  onSelectionChange,
  onToggleMemberLock,
  onOpenMemberWishes,
}: {
  members: MemberWish[];
  filters: RosterFiltersType;
  setFilters: Dispatch<SetStateAction<RosterFiltersType>>;
  selectedRosterId: string | null;
  selectedSeasonId: string | null;
  selectedSeason: GuildSeason | null;
  activeTab: RosterTab;
  setActiveTab: (tab: RosterTab) => void;
  onFakeAction: () => void;
  onValidateWish: (memberId: string, choiceIndex: number, status: ValidationStatus) => void;
  onSelectionChange: (memberId: string, status: RosterSelectionStatus) => void;
  onToggleMemberLock: (memberId: string, locked: boolean) => void;
  onOpenMemberWishes: (member: MemberWish) => void;
}) => {
  const { t, language } = useLanguage();
  const [sortSummary, setSortSummary] = useState('');
  const [visibleRosterColumns, setVisibleRosterColumns] = useState<RosterTableColumnId[]>(DEFAULT_ROSTER_TABLE_COLUMNS);
  const [rosterColumnsCustomized, setRosterColumnsCustomized] = useState(false);
  const filteredMembers = useMemo(() => filterMembers(members, filters), [members, filters]);
  const selectedValidatedMembers = useMemo(
    () => getSelectedValidatedMembers(filteredMembers),
    [filteredMembers],
  );
  const rosterMemberFilterOptions = useMemo(
    () =>
      [...members]
        .map((member) => ({ id: member.id, name: member.username }))
        .sort((a, b) => a.name.localeCompare(b.name, language)),
    [members, language],
  );
  const noOpWishData: WishData[] = [];

  useEffect(() => {
    if (!rosterColumnsCustomized) {
      setVisibleRosterColumns(DEFAULT_ROSTER_TABLE_COLUMNS);
    }
  }, [rosterColumnsCustomized]);

  const toggleRosterColumn = (columnId: RosterTableColumnId, nextChecked: boolean) => {
    setRosterColumnsCustomized(true);
    setVisibleRosterColumns((current) => {
      if (nextChecked) {
        return current.includes(columnId) ? current : [...current, columnId];
      }
      if (current.length <= 1) return current;
      return current.filter((id) => id !== columnId);
    });
  };

  const rosterColumnOptions: { id: RosterTableColumnId; label: string }[] = [
    { id: 'status', label: t.dashboard.rosterTable.status },
    { id: 'rosterDecision', label: t.dashboard.rosterTable.decision },
    { id: 'wishesCount', label: t.dashboard.rosterTable.total },
    { id: 'wish1', label: t.dashboard.rosterTable.choice1 },
    { id: 'wish2', label: t.dashboard.rosterTable.choice2 },
    { id: 'wish3', label: t.dashboard.rosterTable.choice3 },
  ];

  const rosterColumnSelector = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-border/45 bg-card/55 px-2.5 text-sm font-medium text-foreground/85 shadow-none hover:bg-card/75">
          <Columns3 className="h-4 w-4" />
          {t.dashboard.rosterTable.columnSelector}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-border bg-card">
        {rosterColumnOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={visibleRosterColumns.includes(option.id)}
            disabled={visibleRosterColumns.length <= 1 && visibleRosterColumns.includes(option.id)}
            onCheckedChange={(checked) => toggleRosterColumn(option.id, checked === true)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setRosterColumnsCustomized(false);
            setVisibleRosterColumns(DEFAULT_ROSTER_TABLE_COLUMNS);
          }}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t.common.reset}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleTabChange = (value: string) => {
    const nextTab = value as RosterTab;
    setActiveTab(nextTab);
    if (nextTab === 'analytics') {
      capturePostHogProductEvent('demo_viewed_analytics', {
        source: 'public_demo_roster_tabs',
        feature_area: 'rosters',
      });
    }
  };

  return (
    <>
      {selectedSeason && <SeasonStateCallout season={selectedSeason} />}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-3 grid h-auto w-full max-w-full grid-cols-3 overflow-hidden p-1 lg:inline-flex lg:w-auto lg:justify-start">
          <TabsTrigger value="table" className="min-w-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <TableIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{t.dashboard.table}</span>
          </TabsTrigger>
          <TabsTrigger value="selected" className="min-w-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{t.dashboard.selectedValidatedView}</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="min-w-0 gap-1.5 px-2 text-xs sm:gap-2 sm:px-3 sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="truncate">{t.dashboard.analytics}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-2 p-1 md:p-2">
          <RosterFilters
            filters={filters}
            onFiltersChange={setFilters}
            rosterMembers={rosterMemberFilterOptions}
            sortSummary={sortSummary}
            actions={rosterColumnSelector}
          />

          <RosterTable
            members={filteredMembers}
            guildId={demoGuild.id}
            currentUserId="demo-officer"
            selectedRosterId={selectedRosterId}
            selectedSeasonId={selectedSeasonId}
            editingUserId={null}
            editWishes={noOpWishData}
            editStatus="confirmed"
            editSelectionStatus="undecided"
            saving={false}
            maxWishes={13}
            canManageWishes={selectedSeason?.state === 'active'}
            canManageMembers={false}
            isRosterLocked={false}
            isEditingLocked={selectedSeason?.state !== 'active'}
            onStartEditing={onFakeAction}
            onUpdateEditWish={onFakeAction}
            onEditStatusChange={onFakeAction}
            onEditSelectionStatusChange={onFakeAction}
            onEditGuildMainChange={onFakeAction}
            onSaveEditing={onFakeAction}
            onCancelEditing={onFakeAction}
            onAddWish={onFakeAction}
            onRemoveWish={onFakeAction}
            onClearWish={onFakeAction}
            onValidateWish={onValidateWish}
            onToggleMemberLock={onToggleMemberLock}
            onRemoveMember={onFakeAction}
            onSelectionStatusChange={onSelectionChange}
            onViewHistory={onFakeAction}
            onOpenMemberWishes={onOpenMemberWishes}
            onSortSummaryChange={setSortSummary}
            visibleColumns={visibleRosterColumns}
          />
        </TabsContent>

        <TabsContent value="selected">
          <RosterSelectedTable
            members={selectedValidatedMembers}
            currentUserId="demo-officer"
            selectedRosterId={selectedRosterId}
            selectedSeasonId={selectedSeasonId}
            onViewFullTable={() => setActiveTab('table')}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <RosterAnalytics
            members={filteredMembers}
            rosterMembers={rosterMemberFilterOptions}
            rosterMemberFilters={filters.rosterMemberFilters}
            onRosterMemberFiltersChange={(rosterMemberFilters) =>
              setFilters((currentFilters) => ({ ...currentFilters, rosterMemberFilters }))
            }
            metadata={demoAnalyticsMetadata}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};

const DemoMemberWishes = ({
  member,
  selectedSeason,
  onBack,
  onValidateWish,
  onSelectionChange,
}: {
  member: MemberWish | null;
  selectedSeason: GuildSeason | null;
  onBack: () => void;
  onValidateWish: (memberId: string, choiceIndex: number, status: ValidationStatus) => void;
  onSelectionChange: (memberId: string, status: RosterSelectionStatus) => void;
}) => {
  const { t, language } = useLanguage();
  const memberDetailText = t.wishes.memberDetail;

  const getCommitmentBadge = (status: string | null | undefined) => {
    if (status === 'confirmed') {
      return {
        label: t.wishes.commitment.confirmed,
        icon: UserCheck,
        className: commitmentBadgeClass('confirmed'),
      };
    }
    if (status === 'withdrawn') {
      return {
        label: t.wishes.commitment.withdrawn,
        icon: UserX,
        className: commitmentBadgeClass('withdrawn'),
      };
    }
    return {
      label: t.wishes.commitment.undecided,
      icon: UserMinus,
      className: commitmentBadgeClass('undecided'),
    };
  };

  if (!member) {
    return (
      <GlowCard surface="section" className="space-y-3" hoverable={false}>
        <div className="text-sm text-muted-foreground">{t.dashboard.noData}</div>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.common.back}
        </Button>
      </GlowCard>
    );
  }

  const sortedWishes = [...member.wishes].sort((left, right) => left.choice_index - right.choice_index);
  const firstWishGranted = sortedWishes.some((wish) => wish.choice_index === 1 && wish.validation_status === 'approved');
  const commitmentBadge = getCommitmentBadge(member.status);
  const CommitmentIcon = commitmentBadge.icon;

  return (
    <>
      <div className="mb-4">
        <h2 className="font-sans text-xl font-medium text-foreground">
          {t.wishes.wishesOf} {member.username}
        </h2>
      </div>

      {selectedSeason && <SeasonStateCallout season={selectedSeason} />}

      <GlowCard surface="section" className="mb-4" hoverable={false}>
        <div className="grid gap-3 md:grid-cols-[minmax(180px,280px)_max-content] xl:grid-cols-[minmax(180px,280px)_max-content_max-content] xl:gap-8">
          <div className="min-w-0 space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.wishes.rosterDecision.summaryTitle}</div>
            <RosterDecisionToggle
              value={member.selectionStatus || 'undecided'}
              onChange={(status) => onSelectionChange(member.id, status)}
              compact
              className="w-full"
            />
          </div>

          <div className="min-w-0 space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.dashboard.commitment}</div>
            <Badge
              variant="outline"
              className={cn('h-7 px-2.5 py-0 text-xs', commitmentBadge.className)}
            >
              <CommitmentIcon className="mr-1 h-3.5 w-3.5" strokeWidth={1.5} />
              {commitmentBadge.label}
            </Badge>
          </div>

          <div className="min-w-0 space-y-1 text-xs">
            <div className="text-muted-foreground">{memberDetailText.firstWishGranted}</div>
            <div className="truncate font-medium text-foreground">
              {firstWishGranted ? memberDetailText.yes : memberDetailText.no}
            </div>
          </div>

          {member.selectionComment && (
            <p className="min-w-0 text-xs text-muted-foreground md:col-span-2 xl:col-span-3">{member.selectionComment}</p>
          )}
        </div>
      </GlowCard>

      {sortedWishes.length === 0 ? (
        <GlowCard surface="section" className="text-center" hoverable={false}>
          <p className="text-muted-foreground">{t.wishes.noWishes}</p>
        </GlowCard>
      ) : (
        <div className="space-y-2">
          {sortedWishes.map((wish, index) => {
            const cls = getClassById(wish.class_id);
            const specs = wish.spec_ids.map((id) => getSpecById(id)).filter(Boolean) as Specialization[];

            return (
              <GlowCard key={wish.choice_index} surface="section" className="p-3 md:p-4" hoverable={false}>
                <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[40px_200px_1fr_1fr_auto] lg:gap-4">
                  <div className="hidden h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/20 to-secondary/20 lg:flex">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>

                  {cls ? (
                    <div
                      className="flex h-9 w-full items-center rounded-md px-3 text-sm font-medium"
                      style={{
                        backgroundColor: `hsl(var(--class-${cls.id}) / 0.15)`,
                        color: `hsl(var(--class-${cls.id}))`,
                      }}
                    >
                      <span className="mr-2 text-xs text-muted-foreground lg:hidden">#{index + 1}</span>
                      {getLocalizedClassName(cls.id, language)}
                    </div>
                  ) : (
                    <div className="flex h-9 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/20">
                      <span className="text-xs text-muted-foreground/50">-</span>
                    </div>
                  )}

                  {specs.length > 0 ? (
                    <div className="flex h-9 w-full items-center gap-3 overflow-x-auto rounded-md border border-border bg-card/50 px-3">
                      {specs.map((spec, specIndex) => {
                        const config = detailRoleConfig[spec.role];
                        const Icon = getSpecIcon(spec);
                        return (
                          <span key={spec.id} className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                            {specIndex > 0 && <span className="mr-1 text-muted-foreground/50">•</span>}
                            <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
                            <span className="text-foreground">{getLocalizedSpecName(spec.id, language)}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/20">
                      <Shield className="h-4 w-4 text-muted-foreground/30" />
                      <Heart className="h-4 w-4 text-muted-foreground/30" />
                      <Swords className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}

                  {wish.comment ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex h-9 w-full min-w-0 cursor-help items-center overflow-hidden rounded-md border border-border bg-card/50 px-3">
                            <span className="truncate text-sm text-foreground">{wish.comment}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                          <p>{wish.comment}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="flex h-9 w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/20">
                      <span className="text-xs text-muted-foreground/50">-</span>
                    </div>
                  )}

                  <div className="flex justify-end lg:justify-center">
                    <WishValidationBadge
                      status={wish.validation_status || 'pending'}
                      validatedBy={wish.validated_by_username ?? wish.validated_by}
                      validatedAt={wish.validated_at}
                      isGM
                      onValidate={(status) => onValidateWish(member.id, wish.choice_index, status)}
                    />
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>
      )}

      <GlowCard surface="section" className="mt-4" hoverable={false}>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <History className="h-4 w-4 text-primary" />
          {memberDetailText.history}
        </div>
        <p className="text-sm text-muted-foreground">{memberDetailText.historyEmpty}</p>
      </GlowCard>
    </>
  );
};

const demoPollStatusClass: Record<GuildPoll['status'], string> = {
  active: 'border-healer/35 bg-healer/15 text-healer',
  draft: 'border-warning/35 bg-warning/15 text-warning',
  closed: 'border-destructive/35 bg-destructive/10 text-destructive',
};

const getDemoPollQuestionCount = (poll: GuildPoll) => poll.questions?.length ?? 0;
const getDemoPollSectionCount = (poll: GuildPoll) => poll.sections?.length ?? 0;
const hasDemoPollResponse = (poll: GuildPoll) => Boolean(poll.questions?.some((question) => question.my_response));
const getDemoPollAudience = (poll: GuildPoll) => (poll as GuildPoll & { demo_audience?: string }).demo_audience ?? '';
const getDemoPollResultSummary = (poll: GuildPoll) =>
  (poll as GuildPoll & { demo_result_summary?: string }).demo_result_summary ?? '';

const DemoPolls = ({ polls, onFakeAction }: { polls: GuildPoll[]; onFakeAction: () => void }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const activePolls = polls.filter((poll) => poll.status === 'active');
  const draftPolls = polls.filter((poll) => poll.status === 'draft');
  const closedPolls = polls.filter((poll) => poll.status === 'closed');
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'closed'>(
    activePolls.length > 0 ? 'active' : 'closed',
  );

  const renderPollCard = (poll: GuildPoll) => {
    const audience = getDemoPollAudience(poll);
    const resultSummary = getDemoPollResultSummary(poll);
    const canRespond = poll.status === 'active';
    const canViewResults = poll.status === 'closed' || hasDemoPollResponse(poll);

    return (
      <GlowCard key={poll.id} surface="section" hoverable={false} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={demoPollStatusClass[poll.status]}>
                {t.polls.status[poll.status]}
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-card/45 text-muted-foreground">
                {t.demo.pollsUi.demoOnlyBadge}
              </Badge>
              {poll.is_anonymous && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  <Lock className="mr-1 h-3 w-3" />
                  {t.polls.anonymous}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium leading-6 text-foreground">{poll.title}</h3>
              {poll.description && <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{poll.description}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            {canRespond && (
              <Button size="sm" onClick={() => navigate(`/demo/poll/${encodeURIComponent(poll.id)}`)}>
                <Pencil className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t.demo.pollsUi.openPoll}</span>
              </Button>
            )}
            {poll.status === 'draft' && (
              <>
                <Button size="sm" variant="outline" onClick={() => navigate(`/demo/poll/${encodeURIComponent(poll.id)}`)}>
                  <MessageSquare className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t.demo.pollsUi.previewDraft}</span>
                </Button>
                <Button size="sm" variant="outline" onClick={onFakeAction}>
                  <Check className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t.common.publish}</span>
                </Button>
              </>
            )}
            {canViewResults && (
              <Button size="sm" variant={canRespond ? 'outline' : 'default'} onClick={() => navigate(`/demo/poll/${encodeURIComponent(poll.id)}/results`)}>
                <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t.demo.pollsUi.viewResults}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-border/45 bg-background/25 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.demo.pollsUi.audience}</div>
            <div className="mt-1 text-foreground">{audience}</div>
          </div>
          <div className="rounded border border-border/45 bg-background/25 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.polls.resultsUi.kpis.respondents}</div>
            <div className="mt-1 text-foreground">
              {replaceTemplateValues(t.demo.pollsUi.responseRate, {
                count: poll.response_count ?? 0,
                total: poll.member_count ?? 0,
              })}
            </div>
          </div>
          <div className="rounded border border-border/45 bg-background/25 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.polls.resultsUi.kpis.questions}</div>
            <div className="mt-1 text-foreground">{replaceCount(t.demo.pollsUi.questions, getDemoPollQuestionCount(poll))}</div>
          </div>
          <div className="rounded border border-border/45 bg-background/25 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.polls.resultsUi.kpis.sections}</div>
            <div className="mt-1 text-foreground">{replaceCount(t.demo.pollsUi.sections, getDemoPollSectionCount(poll))}</div>
          </div>
        </div>

        {resultSummary && (
          <div className="rounded border border-primary/25 bg-primary/5 p-3 text-sm leading-6 text-foreground">
            {resultSummary}
          </div>
        )}
      </GlowCard>
    );
  };

  return (
    <>
      <PageHeader icon={MessageSquare} title={t.demo.pollsTitle} description={t.demo.pollsDescription} />
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'active' | 'draft' | 'closed')}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-3 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="active" onClick={() => setActiveTab('active')} className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
            <span className="truncate">{t.demo.pollsUi.activeTab} ({activePolls.length})</span>
          </TabsTrigger>
          <TabsTrigger value="draft" onClick={() => setActiveTab('draft')} className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
            <span className="truncate">{t.demo.pollsUi.draftTab} ({draftPolls.length})</span>
          </TabsTrigger>
          <TabsTrigger value="closed" onClick={() => setActiveTab('closed')} className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm">
            <span className="truncate">{t.demo.pollsUi.closedTab} ({closedPolls.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0 space-y-3">
          {activePolls.map(renderPollCard)}
        </TabsContent>
        <TabsContent value="draft" className="mt-0 space-y-3">
          {draftPolls.map(renderPollCard)}
        </TabsContent>
        <TabsContent value="closed" className="mt-0 space-y-3">
          {closedPolls.map(renderPollCard)}
        </TabsContent>
      </Tabs>
    </>
  );
};

const DemoPollNotFound = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        icon={MessageSquare}
        title={t.demo.pollsUi.noPoll}
        description={t.demo.pollsUi.noPollDescription}
        actions={(
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/demo/polls')}>
            <ArrowLeft className="h-4 w-4" />
            {t.common.back}
          </Button>
        )}
      />
      <GlowCard surface="section" hoverable={false} className="py-8 text-center text-sm text-muted-foreground">
        {t.polls.notFound}
      </GlowCard>
    </>
  );
};

const DemoPollDraftPreview = ({ poll, onFakeAction }: { poll: GuildPoll; onFakeAction?: () => void }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <>
      <PageHeader
        icon={MessageSquare}
        title={poll.title}
        description={poll.description}
        actions={(
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/demo/polls')}>
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Button>
            {onFakeAction && (
              <Button type="button" size="sm" onClick={onFakeAction}>
                <Check className="h-4 w-4" />
                {t.common.publish}
              </Button>
            )}
          </>
        )}
      />
      <GlowCard surface="section" hoverable={false} className="space-y-4">
        <div className="rounded border border-warning/30 bg-warning/10 p-3 text-sm leading-6 text-warning">
          {t.demo.pollsUi.draftNotice}
        </div>
        <div className="space-y-4">
          {(poll.sections || []).map((section) => (
            <div key={section.id} className="space-y-3">
              <div>
                <h3 className="text-base font-medium text-foreground">{section.title}</h3>
                {section.description && <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>}
              </div>
              <div className="space-y-2">
                {(poll.questions || [])
                  .filter((question) => question.section_id === section.id)
                  .map((question) => (
                    <div key={question.id} className="rounded border border-border/45 bg-background/25 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-border/60 bg-card/45 text-muted-foreground">
                          {t.polls.resultsUi.questionTypes[question.question_type]}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">{question.question_text}</span>
                      </div>
                      {question.options.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {question.options.map((option) => (
                            <Badge key={option} variant="outline" className="border-border/45 text-muted-foreground">
                              {option}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </GlowCard>
    </>
  );
};

const DemoPollDetail = ({
  poll,
  onFakeAction,
  onSubmit,
}: {
  poll: GuildPoll | null;
  onFakeAction: () => void;
  onSubmit: (pollId: string, responses: { questionId: string; value: ResponseValue }[]) => Promise<void>;
}) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  if (!poll) return <DemoPollNotFound />;
  if (poll.status === 'draft') return <DemoPollDraftPreview poll={poll} onFakeAction={onFakeAction} />;
  if (poll.status === 'closed') return <DemoPollResults poll={poll} />;

  const endsAtLabel = poll.ends_at
    ? formatDateTimeLocalized(poll.ends_at, language, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <>
      <PageHeader
        icon={MessageSquare}
        title={poll.title}
        description={poll.description}
        meta={(
          <>
            {poll.roster?.name && (
              <Badge variant="outline" className="border-border/50 bg-card/45 text-foreground">
                {poll.roster.name}
              </Badge>
            )}
            {endsAtLabel && (
              <span className="text-xs text-muted-foreground">
                {t.polls.endsOn}: {endsAtLabel}
              </span>
            )}
          </>
        )}
        actions={(
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/demo/polls')}>
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/demo/poll/${encodeURIComponent(poll.id)}/results`)}>
              <BarChart3 className="h-4 w-4" />
              {t.common.results}
            </Button>
          </>
        )}
      />
      <PollResponse
        questions={poll.questions || []}
        isAnonymous={poll.is_anonymous}
        onSubmit={(responses) => onSubmit(poll.id, responses)}
        alreadyResponded={hasDemoPollResponse(poll)}
      />
    </>
  );
};

const DemoPollResults = ({ poll }: { poll: GuildPoll | null }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!poll) return <DemoPollNotFound />;
  if (poll.status === 'draft') {
    return <DemoPollDraftPreview poll={poll} />;
  }

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title={poll.title}
        description={t.common.results}
        actions={(
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/demo/polls')}>
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Button>
            {poll.status === 'active' && (
              <Button type="button" size="sm" onClick={() => navigate(`/demo/poll/${encodeURIComponent(poll.id)}`)}>
                <Pencil className="h-4 w-4" />
                {hasDemoPollResponse(poll) ? t.polls.reviewMyResponses : t.polls.respond}
              </Button>
            )}
          </>
        )}
      />
      {poll.status === 'active' && !hasDemoPollResponse(poll) ? (
        <GlowCard surface="section" hoverable={false} className="border-primary/20 bg-primary/5 text-sm text-primary">
          {t.demo.pollsUi.resultsUnavailable}
        </GlowCard>
      ) : (
        <PollResults poll={poll} variant="full" canUseCohortFilters={false} />
      )}
    </>
  );
};

const DemoMembers = ({ onFakeAction }: { onFakeAction: () => void }) => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilters, setClassFilters] = useState<string[]>([]);
  const [rankFilters, setRankFilters] = useState<number[]>([]);
  const [guildforceFilter, setGuildforceFilter] = useState<'all' | 'guildforce' | 'not-guildforce'>('all');
  const [mainFilter, setMainFilter] = useState<'all' | 'main-only' | 'alts-only'>('all');
  const [sortColumn, setSortColumn] = useState<MemberSortColumn>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [classOpen, setClassOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  const [guildforceOpen, setGuildforceOpen] = useState(false);
  const [mainOpen, setMainOpen] = useState(false);

  const memberUi = {
    searchPlaceholder: resolveSemanticMessage({ key: 'guild.members.search_placeholder', language, translations: t }),
    rankPlural: resolveSemanticMessage({ key: 'guild.members.rank_plural', language, translations: t }),
    rankSingle: resolveSemanticMessage({ key: 'guild.members.rank_single', language, translations: t }),
    rankLabel: resolveSemanticMessage({ key: 'guild.members.rank_label', language, translations: t }),
    allRanks: resolveSemanticMessage({ key: 'guild.members.all_ranks', language, translations: t }),
    guildforceLabel: resolveSemanticMessage({ key: 'guild.members.guildforce_label', language, translations: t }),
    notRegistered: resolveSemanticMessage({ key: 'guild.members.not_registered', language, translations: t }),
    notRegisteredPlural: resolveSemanticMessage({ key: 'guild.members.not_registered_plural', language, translations: t }),
    onGuildforce: resolveSemanticMessage({ key: 'guild.members.on_guildforce', language, translations: t }),
    mains: resolveSemanticMessage({ key: 'guild.members.mains', language, translations: t }),
    alts: resolveSemanticMessage({ key: 'guild.members.alts', language, translations: t }),
    mainAlt: resolveSemanticMessage({ key: 'guild.members.main_alt', language, translations: t }),
    mainsOnly: resolveSemanticMessage({ key: 'guild.members.mains_only', language, translations: t }),
    altsOnly: resolveSemanticMessage({ key: 'guild.members.alts_only', language, translations: t }),
    tableCharacter: resolveSemanticMessage({ key: 'guild.members.table_character', language, translations: t }),
    tableRealm: resolveSemanticMessage({ key: 'guild.members.table_realm', language, translations: t }),
    tableLevel: resolveSemanticMessage({ key: 'guild.members.table_level', language, translations: t }),
    tableClass: resolveSemanticMessage({ key: 'guild.members.table_class', language, translations: t }),
    tablePlayer: resolveSemanticMessage({ key: 'guild.members.table_player', language, translations: t }),
    tableRank: resolveSemanticMessage({ key: 'guild.members.table_rank', language, translations: t }),
    noMembers: resolveSemanticMessage({ key: 'guild.members.no_members', language, translations: t }),
    pageLabel: resolveSemanticMessage({ key: 'guild.members.page_label', language, translations: t }),
    previous: resolveSemanticMessage({ key: 'guild.members.previous', language, translations: t }),
    next: resolveSemanticMessage({ key: 'guild.members.next', language, translations: t }),
  };

  const getRankLabel = useCallback(
    (rankName: string | null, rankIndex: number) =>
      formatRankLabel({
        rankName,
        rankIndex,
        rankLabel: memberUi.rankLabel,
        guildMasterLabel: t.guild.rank0,
        customLabel: demoMemberRankLabels[rankIndex],
      }),
    [memberUi.rankLabel, t.guild.rank0],
  );

  const getClassColor = (battlenetClassId: number) => {
    const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
    return classKey ? wowClassColorValue(classKey) : 'hsl(var(--muted-foreground))';
  };

  const getClassName = useCallback(
    (battlenetClassId: number) => {
      const classKey = BATTLENET_CLASS_MAP[battlenetClassId];
      return classKey ? getLocalizedClassName(classKey, language) : memberUi.tableClass;
    },
    [language, memberUi.tableClass],
  );

  const uniqueRanks = useMemo(
    () =>
      Array.from(
        new Map(demoRosterMembers.map((member) => [
          member.rank_index,
          { index: member.rank_index, name: member.rank_name },
        ])).values(),
      ).sort((left, right) => left.index - right.index),
    [],
  );

  const uniqueClasses = useMemo(() => {
    const classIds = new Set(demoRosterMembers.map((member) => BATTLENET_CLASS_MAP[member.character_class_id]).filter(Boolean));
    return wowClasses
      .filter((wowClass) => classIds.has(wowClass.id))
      .sort((left, right) =>
        getLocalizedClassName(left.id, language).localeCompare(getLocalizedClassName(right.id, language), language),
      );
  }, [language]);

  const toggleClass = (classId: string) => {
    setClassFilters((current) =>
      current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId],
    );
    setCurrentPage(1);
  };

  const toggleRank = (rankIndex: number) => {
    setRankFilters((current) =>
      current.includes(rankIndex) ? current.filter((index) => index !== rankIndex) : [...current, rankIndex],
    );
    setCurrentPage(1);
  };

  const filteredMembers = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    return demoRosterMembers.filter((member) => {
      const characterName = member.character_name.toLowerCase();
      const username = member.profile?.username?.toLowerCase() || '';

      if (searchLower && !characterName.includes(searchLower) && !username.includes(searchLower)) {
        return false;
      }

      if (classFilters.length > 0) {
        const classKey = BATTLENET_CLASS_MAP[member.character_class_id];
        if (!classKey || !classFilters.includes(classKey)) return false;
      }

      if (rankFilters.length > 0 && !rankFilters.includes(member.rank_index)) {
        return false;
      }

      if (guildforceFilter === 'guildforce' && !member.matched_user_id) {
        return false;
      }

      if (guildforceFilter === 'not-guildforce' && member.matched_user_id) {
        return false;
      }

      if (mainFilter === 'main-only' && !member.is_main_character) {
        return false;
      }

      if (mainFilter === 'alts-only' && member.is_main_character) {
        return false;
      }

      return true;
    });
  }, [classFilters, guildforceFilter, mainFilter, rankFilters, searchQuery]);

  const sortedMembers = useMemo(() => {
    const compareText = (left: string | null | undefined, right: string | null | undefined) =>
      String(left || '').localeCompare(String(right || ''), language, { sensitivity: 'base' });

    const sorted = [...filteredMembers].sort((left, right) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'character':
          comparison = compareText(left.character_name, right.character_name);
          break;
        case 'realm':
          comparison = compareText(left.character_realm, right.character_realm);
          break;
        case 'level':
          comparison = left.character_level - right.character_level;
          break;
        case 'class':
          comparison = compareText(getClassName(left.character_class_id), getClassName(right.character_class_id));
          break;
        case 'player':
          comparison = compareText(left.profile?.username, right.profile?.username);
          break;
        case 'rank':
          comparison = left.rank_index - right.rank_index;
          break;
        case 'guildforce':
          comparison = Number(Boolean(right.matched_user_id)) - Number(Boolean(left.matched_user_id));
          break;
      }

      if (comparison === 0) {
        comparison = left.rank_index - right.rank_index
          || compareText(left.character_name, right.character_name)
          || compareText(left.character_realm, right.character_realm);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredMembers, getClassName, language, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedMembers.length / MEMBERS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * MEMBERS_PER_PAGE;
    return sortedMembers.slice(start, start + MEMBERS_PER_PAGE);
  }, [currentPage, sortedMembers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, guildforceFilter, mainFilter]);

  const hasClassFilters = classFilters.length > 0;
  const hasRankFilters = rankFilters.length > 0;
  const hasGuildforceFilter = guildforceFilter !== 'all';
  const hasMainFilter = mainFilter !== 'all';
  const selectedClasses = wowClasses.filter((wowClass) => classFilters.includes(wowClass.id));
  const showMemberActions = filteredMembers.some((member) => member.matched_user_id);
  const mobileFilterButtonClassName = 'w-full min-w-0 justify-between gap-2 whitespace-nowrap px-2.5 text-xs md:w-auto md:flex-none md:text-sm';

  const handleSort = (column: MemberSortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortColumn(column);
    setSortDirection(column === 'level' ? 'desc' : 'asc');
  };

  const handleLinkedProfileAction = (member: DemoRosterMember) => {
    if (!member.profile) return;
    onFakeAction();
  };

  const SortableTableHead = ({
    column,
    children,
    className,
  }: {
    column: MemberSortColumn;
    children: ReactNode;
    className?: string;
  }) => {
    const isActive = sortColumn === column;
    const Icon = isActive ? (sortDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
      <TableHead
        aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn(
          'group/header cursor-pointer select-none px-1.5 py-1 text-xs transition-colors',
          isActive
            ? 'bg-primary/5 text-foreground'
            : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
          className,
        )}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap">{children}</span>
          <Icon
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-opacity',
              isActive
                ? 'text-primary opacity-100'
                : 'text-muted-foreground/50 opacity-0 group-hover/header:opacity-100',
            )}
          />
        </div>
      </TableHead>
    );
  };

  const renderMemberActions = (member: DemoRosterMember) => {
    if (!member.matched_user_id) {
      return <span className="block h-8 w-8" aria-hidden="true" />;
    }

    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 border-border/50 bg-card/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            aria-label={t.common.actions}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-border bg-card p-1"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem onClick={onFakeAction} className="cursor-pointer">
            <UserCog className="mr-2 h-4 w-4" />
            {t.battlenet.main}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      <FilterBar className="grid grid-cols-2 gap-2 overflow-visible pb-0 md:flex md:flex-wrap md:items-center">
        <label htmlFor="demo-member-search" className="sr-only">
          {t.common.search}
        </label>
        <FilterSearchField
          id="demo-member-search"
          name="demo-member-search"
          placeholder={memberUi.searchPlaceholder}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          containerClassName="col-span-2 w-full min-w-0 md:w-[280px] md:flex-none"
        />

        <Popover open={classOpen} onOpenChange={setClassOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                mobileFilterButtonClassName,
                'md:min-w-[180px]',
                hasClassFilters && activeFilterControlClassName,
              )}
            >
              {hasClassFilters ? (
                <span className="flex items-center gap-1.5">
                  {selectedClasses.length <= 2 ? (
                    selectedClasses.map((wowClass) => (
                      <span
                        key={wowClass.id}
                        style={{ color: wowClass.color }}
                        className="max-w-[60px] truncate md:max-w-none"
                      >
                        {getLocalizedClassName(wowClass.id, language)}
                      </span>
                    ))
                  ) : (
                    <span>
                      {selectedClasses.length} {t.dashboard.classesCount}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-foreground/70">{t.dashboard.allClasses}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-50 w-56 border-border bg-card p-1.5" align="start">
            <div className="flex max-h-[320px] flex-col gap-0.5 overflow-y-auto">
              {hasClassFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setClassFilters([]);
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10"
                >
                  <X className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{t.dashboard.clear}</span>
                </button>
              )}
              {uniqueClasses.map((wowClass) => {
                const isSelected = classFilters.includes(wowClass.id);

                return (
                  <button
                    type="button"
                    key={wowClass.id}
                    onClick={() => toggleClass(wowClass.id)}
                    className={cn(
                      'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                      isSelected ? 'bg-primary/20' : 'hover:bg-primary/10',
                    )}
                    style={{ color: wowClassColorValue(wowClass.id) }}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span>{getLocalizedClassName(wowClass.id, language)}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={rankOpen} onOpenChange={setRankOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                mobileFilterButtonClassName,
                'md:min-w-[150px]',
                hasRankFilters && activeFilterControlClassName,
              )}
            >
              {hasRankFilters ? (
                <span>
                  {rankFilters.length}{' '}
                  {rankFilters.length > 1 ? memberUi.rankPlural : memberUi.rankSingle}
                </span>
              ) : (
                <span className="text-foreground/70">{memberUi.allRanks}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-50 w-52 border-border bg-card p-1.5" align="start">
            <div className="flex max-h-[320px] flex-col gap-0.5 overflow-y-auto">
              {hasRankFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setRankFilters([]);
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10"
                >
                  <X className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{t.dashboard.clear}</span>
                </button>
              )}
              {uniqueRanks.map((rank) => {
                const isSelected = rankFilters.includes(rank.index);
                const isGMRank = rank.index === 0;
                const isOfficer = rank.index <= DEMO_OFFICER_RANK_THRESHOLD;

                return (
                  <button
                    type="button"
                    key={rank.index}
                    onClick={() => toggleRank(rank.index)}
                    className={cn(
                      'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                      isSelected ? 'bg-primary/20' : 'hover:bg-primary/10',
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    {isGMRank && <Crown className="h-3.5 w-3.5 flex-shrink-0 text-warning" />}
                    {!isGMRank && isOfficer && <Shield className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                    <span className={cn(isGMRank && 'text-warning', !isGMRank && isOfficer && 'text-primary')}>
                      {getRankLabel(rank.name, rank.index)}
                    </span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={guildforceOpen} onOpenChange={setGuildforceOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                mobileFilterButtonClassName,
                'md:min-w-[150px]',
                hasGuildforceFilter && activeFilterControlClassName,
              )}
            >
              {guildforceFilter === 'guildforce' && (
                <span className="flex items-center gap-1.5 text-healer">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{memberUi.guildforceLabel}</span>
                </span>
              )}
              {guildforceFilter === 'not-guildforce' && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  <span>{memberUi.notRegistered}</span>
                </span>
              )}
              {guildforceFilter === 'all' && (
                <span className="text-foreground/70">{memberUi.guildforceLabel}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-50 w-48 border-border bg-card p-1.5" align="start">
            <div className="flex flex-col gap-0.5">
              {hasGuildforceFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setGuildforceFilter('all');
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10"
                >
                  <X className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{t.dashboard.clear}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setGuildforceFilter('guildforce');
                  setGuildforceOpen(false);
                  setCurrentPage(1);
                }}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  guildforceFilter === 'guildforce' ? 'bg-primary/20' : 'hover:bg-primary/10',
                )}
              >
                {guildforceFilter === 'guildforce' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                <CheckCircle2 className="h-4 w-4 text-healer" />
                <span className="text-healer">{memberUi.onGuildforce}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGuildforceFilter('not-guildforce');
                  setGuildforceOpen(false);
                  setCurrentPage(1);
                }}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  guildforceFilter === 'not-guildforce' ? 'bg-primary/20' : 'hover:bg-primary/10',
                )}
              >
                {guildforceFilter === 'not-guildforce' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span>{memberUi.notRegisteredPlural}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={mainOpen} onOpenChange={setMainOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                mobileFilterButtonClassName,
                'md:min-w-[130px]',
                hasMainFilter && activeFilterControlClassName,
              )}
            >
              {mainFilter === 'main-only' && (
                <span className="flex items-center gap-1.5 text-warning">
                  <Star className="h-4 w-4 fill-warning" />
                  <span>{memberUi.mains}</span>
                </span>
              )}
              {mainFilter === 'alts-only' && (
                <span className="text-muted-foreground">{memberUi.alts}</span>
              )}
              {mainFilter === 'all' && (
                <span className="text-foreground/70">{memberUi.mainAlt}</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-50 w-48 border-border bg-card p-1.5" align="start">
            <div className="flex flex-col gap-0.5">
              {hasMainFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setMainFilter('all');
                    setCurrentPage(1);
                  }}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10"
                >
                  <X className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{t.dashboard.clear}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMainFilter('main-only');
                  setMainOpen(false);
                  setCurrentPage(1);
                }}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  mainFilter === 'main-only' ? 'bg-primary/20' : 'hover:bg-primary/10',
                )}
              >
                {mainFilter === 'main-only' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="text-warning">{memberUi.mainsOnly}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMainFilter('alts-only');
                  setMainOpen(false);
                  setCurrentPage(1);
                }}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                  mainFilter === 'alts-only' ? 'bg-primary/20' : 'hover:bg-primary/10',
                )}
              >
                {mainFilter === 'alts-only' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                <span>{memberUi.altsOnly}</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </FilterBar>

      <div className="space-y-2 md:hidden">
        {paginatedMembers.length === 0 ? (
          <div className="rounded border border-border/45 bg-card/25 px-3 py-8 text-center text-sm text-muted-foreground">
            {memberUi.noMembers}
          </div>
        ) : (
          paginatedMembers.map((member, index) => (
            <div
              key={member.id}
              className={cn(
                'w-full rounded border border-border/40 bg-card/25 p-3 text-left transition-colors',
                member.profile ? 'hover:border-primary/35 hover:bg-primary/5' : 'cursor-default',
              )}
              role={member.profile ? 'button' : undefined}
              tabIndex={member.profile ? 0 : undefined}
              onClick={() => handleLinkedProfileAction(member)}
              onKeyDown={(event) => {
                if (!member.profile || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                handleLinkedProfileAction(member);
              }}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
                  {(currentPage - 1) * MEMBERS_PER_PAGE + index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {member.is_guild_master && <Crown className="h-3.5 w-3.5 shrink-0 text-warning" />}
                    {!member.is_guild_master && member.rank_index <= DEMO_OFFICER_RANK_THRESHOLD && (
                      <Shield className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                    <span
                      className="truncate text-sm font-medium"
                      style={{ color: getClassColor(member.character_class_id) }}
                    >
                      {member.character_name}
                    </span>
                    {member.is_main_character && <Star className="h-3.5 w-3.5 shrink-0 fill-warning text-warning" />}
                    {member.character_level > 0 && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">Lv.{member.character_level}</span>
                    )}
                  </div>
                  <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        'h-5 max-w-full px-1.5 text-[10px]',
                        member.is_guild_master && 'border-warning/30 bg-warning/20 text-warning',
                        !member.is_guild_master
                          && member.rank_index <= DEMO_OFFICER_RANK_THRESHOLD
                          && 'border-primary/30 bg-primary/20 text-primary',
                      )}
                    >
                      <span className="truncate">{getRankLabel(member.rank_name, member.rank_index)}</span>
                    </Badge>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {formatRealmDisplayName(member.character_realm, member.character_realm_slug)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {member.profile ? (
                    <div className="flex max-w-[120px] items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.profile.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs font-medium text-foreground">{member.profile.username}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{memberUi.notRegistered}</span>
                  )}
                  <span className="flex h-8 w-8 items-center justify-center">
                    {member.matched_user_id ? (
                      <CheckCircle2 className="h-4 w-4 text-healer" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </span>
                  {showMemberActions && renderMemberActions(member)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border/50 bg-card/30 backdrop-blur-sm md:block">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[50px]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[82px]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[96px]" />
            {showMemberActions && <col className="w-[52px]" />}
          </colgroup>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[50px]">#</TableHead>
              <SortableTableHead column="character" className="min-w-0">{memberUi.tableCharacter}</SortableTableHead>
              <SortableTableHead column="realm" className="min-w-0">{memberUi.tableRealm}</SortableTableHead>
              <SortableTableHead column="level" className="text-right">{memberUi.tableLevel}</SortableTableHead>
              <SortableTableHead column="class" className="hidden md:table-cell">{memberUi.tableClass}</SortableTableHead>
              <SortableTableHead column="player">{memberUi.tablePlayer}</SortableTableHead>
              <SortableTableHead column="rank">{memberUi.tableRank}</SortableTableHead>
              <SortableTableHead column="guildforce" className="text-center">{memberUi.guildforceLabel}</SortableTableHead>
              {showMemberActions && (
                <TableHead className="w-[52px]">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showMemberActions ? 9 : 8} className="py-8 text-center text-muted-foreground">
                  {memberUi.noMembers}
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map((member, index) => (
                <TableRow
                  key={member.id}
                  className={cn(
                    'border-border/30 transition-colors',
                    member.profile && 'cursor-pointer hover:bg-primary/5',
                  )}
                  onClick={() => handleLinkedProfileAction(member)}
                  onKeyDown={(event) => {
                    if (!member.profile || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    handleLinkedProfileAction(member);
                  }}
                  tabIndex={member.profile ? 0 : undefined}
                >
                  <TableCell className="text-sm text-muted-foreground">
                    {(currentPage - 1) * MEMBERS_PER_PAGE + index + 1}
                  </TableCell>
                  <TableCell className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      {member.is_guild_master && <Crown className="h-4 w-4 shrink-0 text-warning" />}
                      {!member.is_guild_master && member.rank_index <= DEMO_OFFICER_RANK_THRESHOLD && (
                        <Shield className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <span
                        className="min-w-0 truncate font-medium"
                        style={{ color: getClassColor(member.character_class_id) }}
                      >
                        {member.character_name}
                      </span>
                      {member.is_main_character && <Star className="h-3.5 w-3.5 shrink-0 fill-warning text-warning" />}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <span className="block truncate text-sm text-muted-foreground">
                      {formatRealmDisplayName(member.character_realm, member.character_realm_slug) || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                    {member.character_level > 0 ? member.character_level : '-'}
                  </TableCell>
                  <TableCell className="hidden min-w-0 md:table-cell">
                    <span
                      className="block truncate text-sm"
                      style={{ color: getClassColor(member.character_class_id) }}
                    >
                      {getClassName(member.character_class_id)}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-0">
                    {member.profile ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={member.profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.profile.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 truncate text-sm">{member.profile.username}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        'max-w-full text-xs',
                        member.is_guild_master && 'border-warning/30 bg-warning/20 text-warning',
                        !member.is_guild_master
                          && member.rank_index <= DEMO_OFFICER_RANK_THRESHOLD
                          && 'border-primary/30 bg-primary/20 text-primary',
                      )}
                    >
                      <span className="truncate">{getRankLabel(member.rank_name, member.rank_index)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="mx-auto flex h-8 w-8 items-center justify-center">
                      {member.matched_user_id ? (
                        <CheckCircle2 className="h-4 w-4 text-healer" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </span>
                  </TableCell>
                  {showMemberActions && (
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end">{renderMemberActions(member)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="relative z-10 mt-4 pb-6">
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="h-9 border-border/50 !bg-input/60 px-3 backdrop-blur-sm hover:!bg-input/80"
              aria-label={memberUi.previous}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{memberUi.previous}</span>
            </Button>

            <span className="min-w-[92px] text-center text-sm text-foreground/70">
              {memberUi.pageLabel} {currentPage} / {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="h-9 border-border/50 !bg-input/60 px-3 backdrop-blur-sm hover:!bg-input/80"
              aria-label={memberUi.next}
            >
              <span className="hidden sm:inline">{memberUi.next}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

const DemoSettings = ({ lockDays }: { lockDays: number }) => {
  const { t } = useLanguage();

  return (
    <>
      <PageHeader icon={Shield} title={t.guildNav.settings} description={t.demo.bannerDescription} />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border/50 bg-card/45 p-4">
          <div className="text-sm font-medium text-foreground">{t.demo.labels.guild}</div>
          <div className="mt-2 text-lg text-foreground">{demoGuild.name}</div>
          <div className="text-sm text-muted-foreground">{demoGuild.region} {demoGuild.server}</div>
        </div>
        <div className="rounded-md border border-border/50 bg-card/45 p-4">
          <div className="text-sm font-medium text-foreground">{t.demo.labels.roster}</div>
          <div className="mt-2 text-lg text-foreground">{demoRoster.name}</div>
          <div className="text-sm text-warning">{replaceCount(t.demo.labels.lock, lockDays)}</div>
        </div>
      </div>
    </>
  );
};

export default Demo;
