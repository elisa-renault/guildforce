import { format, parseISO } from 'date-fns';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  GitBranch,
  Loader2,
  ListOrdered,
  Lock,
  MessageSquareText,
  PieChart,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getPollResultsCohortOptions } from './pollResultsCohort';
import {
  applyPollResultsView,
  buildPollResultsModel,
  type PollQuestionResultModel,
  type PollResultsChoiceStat,
  type PollResultsSectionModel,
  type PollResultsSortMode,
  type PollResultsTone,
  type PollResultsTypeFilter,
} from './pollResultsModel';

import { GlowCard } from '@/components/GlowCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StarDisplay } from '@/components/ui/star-rating';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePollResultsCohortAnalysis } from '@/hooks/usePollResultsCohortAnalysis';
import { formatDateLocalized, formatNumberLocalized, interpolateMessage } from '@/i18n/format';
import { DATE_LOCALE_BY_LANGUAGE } from '@/lib/dateLocale';
import { toneBadgeClass, toneCalloutClass } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  OTHER_OPTION_VALUE,
  type GuildPoll,
  type PollQuestionAiSummary,
  type PollQuestionType,
  type PollResultsCohortFilter,
  type PollResultsVariant,
} from '@/types/poll';

interface PollResultsProps {
  poll: GuildPoll;
  variant: PollResultsVariant;
  canUseCohortFilters?: boolean;
  aiSummaries?: PollQuestionAiSummary[];
  aiSummariesLoading?: boolean;
  aiSummariesError?: string | null;
  canGenerateAiSummaries?: boolean;
  aiSummariesGenerating?: boolean;
  onGenerateAiSummaries?: () => void | Promise<unknown>;
}

const QUESTION_TYPE_ICONS: Record<PollQuestionType, typeof BarChart3> = {
  single_choice: BarChart3,
  multiple_choice: PieChart,
  text: MessageSquareText,
  rating: Star,
  date: Calendar,
  time: Clock,
  datetime: Calendar,
  ranking: ListOrdered,
  scale: SlidersHorizontal,
};

const QUESTION_TYPE_COLORS: Record<PollQuestionType, string> = {
  single_choice: 'bg-primary/10 text-primary border-primary/30',
  multiple_choice: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  text: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  rating: 'bg-warning/10 text-warning border-warning/30',
  date: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  time: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  datetime: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  ranking: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30',
  scale: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
};

const TONE_BADGE_STYLES = {
  strong: toneBadgeClass('success'),
  mixed: toneBadgeClass('neutral'),
  review: toneBadgeClass('warning'),
  informative: toneBadgeClass('info'),
} as const;

const INFO_BADGE_CLASS = toneBadgeClass('info');
const NEUTRAL_BADGE_CLASS = 'border-border bg-card/60 text-foreground';

const TEXT_PREVIEW_COUNT = {
  compact: 2,
  full: 4,
} as const;

type PollResultsToneFilter = 'all' | PollResultsTone;

export const PollResults = ({
  poll,
  variant,
  canUseCohortFilters = false,
  aiSummaries = [],
  aiSummariesLoading = false,
  aiSummariesError = null,
  canGenerateAiSummaries = false,
  aiSummariesGenerating = false,
  onGenerateAiSummaries,
}: PollResultsProps) => {
  const { language, t } = useLanguage();
  const isFull = variant === 'full';
  const [quickNavTopOffset, setQuickNavTopOffset] = useState(96);
  const displayMode = 'percentage';
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<PollResultsTypeFilter>('all');
  const [sortMode, setSortMode] = useState<PollResultsSortMode>('original');
  const [toneFilter, setToneFilter] = useState<PollResultsToneFilter>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [expandedTextBlocks, setExpandedTextBlocks] = useState<Record<string, boolean>>({});
  const [expandedAiSummaries, setExpandedAiSummaries] = useState<Record<string, boolean>>({});
  const [cohortFilters, setCohortFilters] = useState<PollResultsCohortFilter[]>([]);

  const cohortOptions = useMemo(() => getPollResultsCohortOptions(poll), [poll]);
  const {
    analysis: cohortAnalysis,
    poll: cohortPoll,
    loading: cohortLoading,
    error: cohortError,
  } = usePollResultsCohortAnalysis({
    poll,
    enabled: isFull && canUseCohortFilters,
    filters: cohortFilters,
  });
  const activePoll = cohortPoll || poll;
  const model = buildPollResultsModel(activePoll);
  const globalModel = useMemo(
    () => (cohortFilters.length > 0 ? buildPollResultsModel(poll) : null),
    [cohortFilters.length, poll],
  );
  const isCohortActive = cohortFilters.length > 0;
  const globalQuestionMap = useMemo(
    () => new Map((globalModel?.questions || []).map((question) => [question.id, question])),
    [globalModel],
  );
  const aiSummaryMap = useMemo(
    () => new Map(aiSummaries.map((summary) => [summary.question_id, summary])),
    [aiSummaries],
  );
  const hasTextQuestions = useMemo(
    () => Boolean((poll.questions || []).some((question) => question.question_type === 'text')),
    [poll.questions],
  );
  const hasGeneratedAiSummaries = aiSummaries.some((summary) => summary.status !== 'not_generated');

  useEffect(() => {
    if (!isFull) {
      return;
    }

    let raf = 0;

    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const globalNav = document.querySelector<HTMLElement>('[data-global-nav]');
        const guildSubNav = document.querySelector<HTMLElement>('[data-guild-subnav]');
        const globalNavHeight = globalNav?.offsetHeight ?? 0;
        const guildSubNavHeight = guildSubNav?.offsetHeight ?? 0;
        const nextOffset = globalNavHeight + guildSubNavHeight + 16;

        setQuickNavTopOffset((prev) => (prev === nextOffset ? prev : nextOffset));
      });
    };

    compute();
    window.addEventListener('resize', compute);

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(compute);
    const globalNavEl = document.querySelector<HTMLElement>('[data-global-nav]');
    const guildSubNavEl = document.querySelector<HTMLElement>('[data-guild-subnav]');

    if (resizeObserver && globalNavEl) {
      resizeObserver.observe(globalNavEl);
    }

    if (resizeObserver && guildSubNavEl) {
      resizeObserver.observe(guildSubNavEl);
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [isFull]);

  const visibleQuestions = applyPollResultsView(model, {
    sectionId: sectionFilter,
    type: typeFilter,
    tone: isFull ? toneFilter : 'all',
    sort: isFull ? sortMode : 'original',
  });

  const visibleSections = model.sections.filter((section) =>
    visibleQuestions.some((question) => question.sectionId === section.id),
  );
  const visibleQuestionGroups = visibleSections.map((section) => ({
    section,
    questions: visibleQuestions.filter((question) => question.sectionId === section.id),
  }));
  const toneCounts = useMemo(
    () =>
      model.questions.reduce<Record<PollResultsTone, number>>(
        (counts, question) => {
          counts[question.tone] += 1;
          return counts;
        },
        { strong: 0, mixed: 0, review: 0, informative: 0 },
      ),
    [model.questions],
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  };

  const toggleTextBlock = (questionId: string) => {
    setExpandedTextBlocks((current) => ({ ...current, [questionId]: !current[questionId] }));
  };

  const toggleAiSummary = (questionId: string) => {
    setExpandedAiSummaries((current) => ({ ...current, [questionId]: !current[questionId] }));
  };

  const setAllSectionsCollapsed = (collapsed: boolean) => {
    const nextState: Record<string, boolean> = {};
    visibleSections.forEach((section) => {
      nextState[section.id] = collapsed;
    });
    setCollapsedSections(nextState);
  };

  const setAllTextBlocksExpanded = (expanded: boolean) => {
    const nextState: Record<string, boolean> = {};
    visibleQuestions.forEach((question) => {
      if (question.question.question_type === 'text') {
        nextState[question.id] = expanded;
      }
    });
    setExpandedTextBlocks(nextState);
  };

  const getDefaultCohortFilter = (): PollResultsCohortFilter | null => {
    const firstQuestion = cohortOptions[0];
    const firstValue = firstQuestion?.matchValues[0];
    if (!firstQuestion || !firstValue) {
      return null;
    }

    return {
      question_id: firstQuestion.question.id,
      question_type: firstQuestion.question.question_type,
      match_value: firstValue,
    };
  };

  const addCohortFilter = () => {
    const nextFilter = getDefaultCohortFilter();
    if (!nextFilter) return;
    setCohortFilters((current) => [...current, nextFilter]);
  };

  const updateCohortFilterQuestion = (index: number, questionId: string) => {
    const option = cohortOptions.find((entry) => entry.question.id === questionId);
    if (!option) return;

    setCohortFilters((current) =>
      current.map((filter, filterIndex) =>
        filterIndex === index
          ? {
              question_id: option.question.id,
              question_type: option.question.question_type,
              match_value: option.matchValues[0] || '',
            }
          : filter,
      ),
    );
  };

  const updateCohortFilterValue = (index: number, value: string) => {
    setCohortFilters((current) =>
      current.map((filter, filterIndex) =>
        filterIndex === index ? { ...filter, match_value: value } : filter,
      ),
    );
  };

  const removeCohortFilter = (index: number) => {
    setCohortFilters((current) => current.filter((_, filterIndex) => filterIndex !== index));
  };

  const resetCohortFilters = () => {
    setCohortFilters([]);
  };

  const getQuestionTypeLabel = (questionType: PollQuestionType) => t.polls.resultsUi.questionTypes[questionType];
  const getSectionTitle = (section: PollResultsSectionModel) =>
    section.isUnsectioned ? t.polls.resultsUi.unsectioned : section.title;
  const formatCount = (value: number) => formatNumberLocalized(value, language);
  const formatPercentage = (value: number) => `${formatNumberLocalized(Number(value.toFixed(0)), language)}%`;
  const formatFilterValue = (questionType: PollQuestionType, value: string) => {
    if (value === OTHER_OPTION_VALUE) {
      return t.polls.otherSpecify;
    }

    if (questionType === 'date') {
      try {
        return format(parseISO(value), 'PPP', { locale: DATE_LOCALE_BY_LANGUAGE[language] });
      } catch {
        return value;
      }
    }

    if (questionType === 'datetime') {
      try {
        return format(parseISO(value), 'PPP p', { locale: DATE_LOCALE_BY_LANGUAGE[language] });
      } catch {
        return value;
      }
    }

    if (questionType === 'rating') {
      return `${value} / 5`;
    }

    return value;
  };
  const getSectionSummaryText = (section: PollResultsSectionModel) =>
    interpolateMessage(
      section.questionCount <= 1
        ? t.polls.resultsUi.sectionSummarySingular
        : t.polls.resultsUi.sectionSummaryPlural,
      {
        questions: formatCount(section.questionCount),
        flagged: formatCount(section.flaggedCount),
      },
    );

  const getToneLabel = (question: PollQuestionResultModel) => {
    if (question.tone === 'strong') return t.polls.resultsUi.strongConsensus;
    if (question.tone === 'review') return t.polls.resultsUi.needsReview;
    if (question.tone === 'informative') return t.polls.resultsUi.contextLabel;
    return t.polls.resultsUi.mixedSignal;
  };

  const getToneFilterLabel = (tone: PollResultsToneFilter) => {
    if (tone === 'all') return t.polls.resultsUi.allTones;
    if (tone === 'strong') return t.polls.resultsUi.strongConsensus;
    if (tone === 'review') return t.polls.resultsUi.needsReview;
    if (tone === 'informative') return t.polls.resultsUi.contextLabel;
    return t.polls.resultsUi.mixedSignal;
  };

  const formatQuestionOptionLabel = (question: PollQuestionResultModel, label: string) => {
    return formatFilterValue(question.question.question_type, label);
  };

  const getTakeawayText = (question: PollQuestionResultModel) => {
    const takeaway = question.takeaway;
    if (takeaway.kind === 'leader') {
      const margin =
        takeaway.marginPercentage === null
          ? t.polls.resultsUi.noRunnerUp
          : interpolateMessage(t.polls.resultsUi.marginPoints, {
              value: formatPercentage(takeaway.marginPercentage),
            });
      return interpolateMessage(t.polls.resultsUi.takeaways.leader, {
        label: formatQuestionOptionLabel(question, takeaway.label),
        percentage: formatPercentage(takeaway.leaderPercentage),
        margin,
      });
    }
    if (takeaway.kind === 'selection') {
      return interpolateMessage(t.polls.resultsUi.takeaways.selection, {
        label: formatQuestionOptionLabel(question, takeaway.label),
        count: formatCount(takeaway.count),
        total: formatCount(takeaway.total),
      });
    }
    if (takeaway.kind === 'average') {
      return interpolateMessage(t.polls.resultsUi.takeaways.average, {
        value: formatNumberLocalized(Number(takeaway.average.toFixed(1)), language, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        max: formatCount(takeaway.max),
        dispersion: t.polls.resultsUi.dispersion[takeaway.dispersion],
      });
    }
    return interpolateMessage(t.polls.resultsUi.takeaways.text, {
      count: formatCount(takeaway.count),
    });
  };

  const getAiSummaryButtonLabel = () =>
    hasGeneratedAiSummaries ? t.polls.resultsUi.aiSummary.regenerate : t.polls.resultsUi.aiSummary.generate;

  const renderAiSummary = (summary: PollQuestionAiSummary | undefined) => {
    if (!summary) {
      if (aiSummariesLoading) {
        return (
          <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{t.polls.resultsUi.aiSummary.loading}</span>
            </div>
          </div>
        );
      }

      if (aiSummariesError) {
        return (
          <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
            {t.polls.resultsUi.aiSummary.unavailable}
          </div>
        );
      }

      return canGenerateAiSummaries ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-4 text-sm text-muted-foreground">
          {t.polls.resultsUi.aiSummary.notGenerated}
        </div>
      ) : null;
    }

    if (summary.status === 'insufficient_data') {
      return (
        <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          {t.polls.resultsUi.aiSummary.insufficientData}
        </div>
      );
    }

    if (summary.status === 'unavailable' || !summary.summary) {
      return (
        <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
          {t.polls.resultsUi.aiSummary.unavailable}
        </div>
      );
    }

    const hasDetails =
      Boolean(summary.generated_at) ||
      summary.summary.themes.length > 0 ||
      summary.summary.polarity_clusters.length > 0 ||
      summary.summary.keywords.length > 0;
    const isExpanded = expandedAiSummaries[summary.question_id] ?? false;

    return (
      <div className="rounded-xl border border-border/70 bg-card/40 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', toneCalloutClass('info'))}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-3 pr-1">
            <div className="space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                    {t.polls.resultsUi.aiSummary.title}
                  </p>
                  <p className="text-sm leading-6 text-foreground break-words">{summary.summary.headline}</p>
                </div>
                {hasDetails && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 self-start border-primary/50 bg-background/85 px-3 text-xs font-medium text-foreground shadow-sm hover:bg-primary/15 hover:text-foreground"
                    onClick={() => toggleAiSummary(summary.question_id)}
                  >
                    {isExpanded ? t.polls.resultsUi.aiSummary.hideDetails : t.polls.resultsUi.aiSummary.showDetails}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>

            {hasDetails && (
              <Collapsible open={isExpanded}>
                <CollapsibleContent className="space-y-3">
                  {summary.generated_at && (
                    <p className="text-xs text-muted-foreground">
                      {interpolateMessage(t.polls.resultsUi.aiSummary.generatedAtValue, {
                        value: formatDateLocalized(summary.generated_at, language, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }),
                      })}
                    </p>
                  )}

                  {summary.summary.themes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t.polls.resultsUi.aiSummary.themes}
                      </p>
                      <div className="space-y-2">
                        {summary.summary.themes.map((theme) => (
                          <div key={`${summary.question_id}-theme-${theme.label}`} className="rounded-lg border border-border/60 bg-background/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">{theme.label}</p>
                              <Badge variant="outline" className="border-border bg-card/60 text-foreground">
                                {formatCount(theme.count)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{theme.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.summary.polarity_clusters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t.polls.resultsUi.aiSummary.polarityClusters}
                      </p>
                      <div className="space-y-2">
                        {summary.summary.polarity_clusters.map((cluster) => (
                          <div key={`${summary.question_id}-cluster-${cluster.label}`} className="rounded-lg border border-border/60 bg-background/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">{cluster.label}</p>
                              <Badge variant="outline" className="border-border bg-card/60 text-foreground">
                                {formatCount(cluster.count)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{cluster.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.summary.keywords.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t.polls.resultsUi.aiSummary.keywords}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {summary.summary.keywords.map((keyword) => (
                          <Badge
                            key={`${summary.question_id}-keyword-${keyword}`}
                            className="max-w-full whitespace-normal break-words border-primary/80 bg-primary px-3 py-1 leading-tight text-primary-foreground shadow-sm shadow-primary/30"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderChoiceMetric = (choice: PollResultsChoiceStat) =>
    displayMode === 'percentage'
      ? `${formatPercentage(choice.percentage)} · ${formatCount(choice.count)}`
      : `${formatCount(choice.count)} · ${formatPercentage(choice.percentage)}`;

  const strongestConsensus = model.strongestConsensusQuestion
    ? model.questions.find((question) => question.id === model.strongestConsensusQuestion?.id) || null
    : null;
  const mostDivisive = model.mostDivisiveQuestion
    ? model.questions.find((question) => question.id === model.mostDivisiveQuestion?.id) || null
    : null;

  const renderHeader = () => {
    if (!isFull) {
      return (
        <GlowCard className="p-4" hoverable={false}>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-border bg-card/60 text-foreground">
              <Users className="mr-1 h-3.5 w-3.5" />
              {interpolateMessage(t.polls.resultsUi.kpis.respondentsValue, { count: formatCount(model.respondentCount) })}
            </Badge>
            {poll.is_anonymous && (
              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                <Lock className="mr-1 h-3.5 w-3.5" />
                {t.polls.resultsUi.anonymousBadge}
              </Badge>
            )}
            {visibleSections.length > 0 && (
              <div className="w-full overflow-x-auto pb-1">
                <div className="flex gap-2">
                  {visibleSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#poll-section-${section.id}`}
                      className="rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                    >
                      {getSectionTitle(section)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </GlowCard>
      );
    }

    const pollStatus =
      poll.status === 'closed'
        ? t.polls.status.closed
        : poll.status === 'draft'
          ? t.polls.status.draft
          : t.polls.status.active;

    return (
      <GlowCard className="p-6" hoverable={false}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border bg-card/60 text-foreground">
                {pollStatus}
              </Badge>
              {poll.is_anonymous && (
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                  <Lock className="mr-1 h-3.5 w-3.5" />
                  {t.polls.resultsUi.anonymousBadge}
                </Badge>
              )}
              {poll.roster?.name && (
                <Badge variant="outline" className="border-border bg-card/60 text-foreground">
                  {interpolateMessage(t.polls.resultsUi.rosterValue, { value: poll.roster.name })}
                </Badge>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">{poll.title}</h1>
              {poll.description && (
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">{poll.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {poll.creator?.username && (
                <span>{interpolateMessage(t.polls.resultsUi.createdByValue, { value: poll.creator.username })}</span>
              )}
              {poll.ends_at && (
                <span>
                  {interpolateMessage(t.polls.resultsUi.endsAtValue, {
                    value: formatDateLocalized(poll.ends_at, language, { dateStyle: 'medium', timeStyle: 'short' }),
                  })}
                </span>
              )}
              <span>
                {interpolateMessage(t.polls.resultsUi.kpis.respondentsValue, { count: formatCount(model.respondentCount) })}
              </span>
            </div>
            {isFull && hasTextQuestions && canGenerateAiSummaries && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t.polls.resultsUi.aiSummary.headerTitle}</p>
                    <p className="text-sm text-muted-foreground">{t.polls.resultsUi.aiSummary.headerHint}</p>
                    {aiSummariesError && <p className="text-sm text-destructive">{aiSummariesError}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void onGenerateAiSummaries?.();
                    }}
                    disabled={aiSummariesGenerating || !onGenerateAiSummaries}
                  >
                    {aiSummariesGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.polls.resultsUi.aiSummary.generating}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {getAiSummaryButtonLabel()}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:min-w-[540px] lg:max-w-[760px] lg:flex-[0_0_48%] xl:min-w-[620px] xl:max-w-[860px]">
            <SummaryTile label={t.polls.resultsUi.kpis.respondents} value={formatCount(model.respondentCount)} icon={Users} />
            <SummaryTile label={t.polls.resultsUi.kpis.questions} value={formatCount(model.questionCount)} icon={ListOrdered} />
            <SummaryTile
              label={t.polls.resultsUi.kpis.strongestConsensus}
              value={strongestConsensus?.question.question_text || t.polls.resultsUi.noSummary}
              helper={strongestConsensus ? getTakeawayText(strongestConsensus) : t.polls.resultsUi.noSummary}
              icon={CheckCircle2}
            />
            <SummaryTile
              label={t.polls.resultsUi.kpis.mostDivisive}
              value={mostDivisive?.question.question_text || t.polls.resultsUi.noSummary}
              helper={mostDivisive ? getTakeawayText(mostDivisive) : t.polls.resultsUi.noSummary}
              icon={GitBranch}
            />
          </div>
        </div>
      </GlowCard>
    );
  };

  const renderCohortBuilder = () => {
    if (!isFull || !canUseCohortFilters) {
      return null;
    }

    return (
      <GlowCard className="p-4" hoverable={false}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">{t.polls.resultsUi.cohortAnalysis}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.polls.resultsUi.cohortAnalysisHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={addCohortFilter} disabled={cohortOptions.length === 0}>
                <Plus className="h-4 w-4" />
                {t.polls.resultsUi.cohortAddFilter}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={resetCohortFilters} disabled={cohortFilters.length === 0}>
                <RotateCcw className="h-4 w-4" />
                {t.polls.resultsUi.cohortReset}
              </Button>
            </div>
          </div>

          {cohortFilters.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
              {t.polls.resultsUi.cohortEmpty}
            </div>
          ) : (
            <div className="space-y-3">
              {cohortFilters.map((filter, index) => {
                const option = cohortOptions.find((entry) => entry.question.id === filter.question_id) || cohortOptions[0];
                const matchValues = option?.matchValues || [];

                return (
                  <div key={`${filter.question_id}-${index}`} className="space-y-3 rounded-xl border border-border/70 bg-background/40 p-4">
                    {index > 0 && (
                      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                        {t.polls.resultsUi.cohortAnd}
                      </Badge>
                    )}
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px_auto]">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t.polls.resultsUi.cohortQuestion}
                        </p>
                        <Select value={filter.question_id} onValueChange={(value) => updateCohortFilterQuestion(index, value)}>
                          <SelectTrigger aria-label={t.polls.resultsUi.cohortQuestion}>
                            <SelectValue placeholder={t.polls.resultsUi.cohortQuestion} />
                          </SelectTrigger>
                          <SelectContent>
                            {cohortOptions.map((entry) => (
                              <SelectItem key={entry.question.id} value={entry.question.id}>
                                {entry.question.question_text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t.polls.resultsUi.cohortValue}
                        </p>
                        <Select value={filter.match_value} onValueChange={(value) => updateCohortFilterValue(index, value)}>
                          <SelectTrigger aria-label={t.polls.resultsUi.cohortValue}>
                            <SelectValue placeholder={t.polls.resultsUi.cohortValue} />
                          </SelectTrigger>
                          <SelectContent>
                            {matchValues.map((value) => (
                              <SelectItem key={`${filter.question_id}-${value}`} value={value}>
                                {formatFilterValue(option.question.question_type, value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeCohortFilter(index)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cohortLoading && cohortFilters.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.polls.resultsUi.cohortLoading}
            </div>
          )}

          {cohortError && cohortFilters.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {cohortError}
            </div>
          )}
        </div>
      </GlowCard>
    );
  };

  const renderCohortContext = () => {
    if (!isCohortActive || !cohortAnalysis) {
      return null;
    }

    const filterSummary = cohortAnalysis.filters
      .map((filter) => {
        const question = poll.questions?.find((item) => item.id === filter.question_id);
        if (!question) return null;
        return `${question.question_text}: ${formatFilterValue(filter.question_type, filter.match_value)}`;
      })
      .filter((value): value is string => Boolean(value))
      .join(` ${t.polls.resultsUi.cohortAnd} `);

    return (
      <GlowCard className="p-4" hoverable={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              {t.polls.resultsUi.cohortActive}
            </p>
            <p className="text-sm font-medium text-foreground">{filterSummary}</p>
            <p className="text-sm text-muted-foreground">
              {interpolateMessage(t.polls.resultsUi.cohortRespondentsValue, {
                count: formatCount(cohortAnalysis.cohort_respondent_count),
                total: formatCount(cohortAnalysis.global_respondent_count),
              })}
            </p>
          </div>
          {cohortAnalysis.is_anonymous_guarded && (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              <Lock className="mr-1 h-3.5 w-3.5" />
              {t.polls.resultsUi.cohortAnonymousGuarded}
            </Badge>
          )}
        </div>
      </GlowCard>
    );
  };

  const renderControls = () => (
    <GlowCard className="p-3 sm:p-4" hoverable={false}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {t.polls.resultsUi.controls}
              </p>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                {interpolateMessage(t.polls.resultsUi.visibleQuestionsValue, {
                  count: formatCount(visibleQuestions.length),
                })}
              </Badge>
            </div>
          </div>

        </div>

        <div className={cn('grid gap-2.5', isFull ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2')}>
            <div className="space-y-1.5">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t.polls.resultsUi.filterSection}
              </p>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger aria-label={t.polls.resultsUi.filterSection} className="h-10 rounded-lg border-border/70 bg-background/70">
                  <SelectValue placeholder={t.polls.resultsUi.filterSection} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.polls.resultsUi.allSections}</SelectItem>
                  {model.sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {getSectionTitle(section)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t.polls.resultsUi.filterType}
              </p>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as PollResultsTypeFilter)}>
                <SelectTrigger aria-label={t.polls.resultsUi.filterType} className="h-10 rounded-lg border-border/70 bg-background/70">
                  <SelectValue placeholder={t.polls.resultsUi.filterType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.polls.resultsUi.allTypes}</SelectItem>
                  <SelectItem value="text-only">{t.polls.resultsUi.textOnly}</SelectItem>
                  {(['single_choice', 'multiple_choice', 'text', 'rating', 'date', 'time', 'datetime', 'ranking', 'scale'] as PollQuestionType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getQuestionTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFull && (
              <div className="space-y-1.5">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t.polls.resultsUi.sortBy}
                </p>
                <Select value={sortMode} onValueChange={(value) => setSortMode(value as PollResultsSortMode)}>
                  <SelectTrigger aria-label={t.polls.resultsUi.sortBy} className="h-10 rounded-lg border-border/70 bg-background/70">
                    <SelectValue placeholder={t.polls.resultsUi.sortBy} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">{t.polls.resultsUi.sort.original}</SelectItem>
                    <SelectItem value="consensus">{t.polls.resultsUi.sort.consensus}</SelectItem>
                    <SelectItem value="divisive">{t.polls.resultsUi.sort.divisive}</SelectItem>
                    <SelectItem value="responses">{t.polls.resultsUi.sort.responses}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isFull && (
              <div className="space-y-1.5">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t.polls.resultsUi.filterTone}
                </p>
                <Select value={toneFilter} onValueChange={(value) => setToneFilter(value as PollResultsToneFilter)}>
                  <SelectTrigger aria-label={t.polls.resultsUi.filterTone} className="h-10 rounded-lg border-border/70 bg-background/70">
                    <SelectValue placeholder={t.polls.resultsUi.filterTone} />
                  </SelectTrigger>
                  <SelectContent>
                    {(['all', 'strong', 'mixed', 'review', 'informative'] as PollResultsToneFilter[]).map((tone) => {
                      const count = tone === 'all' ? model.questions.length : toneCounts[tone];
                      return (
                        <SelectItem key={tone} value={tone}>
                          {`${getToneFilterLabel(tone)} (${formatCount(count)})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>

        {isFull && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
            <Button type="button" size="sm" variant="outline" className="rounded-lg bg-background/50" onClick={() => setAllSectionsCollapsed(true)}>
              {t.polls.resultsUi.collapseSections}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg bg-background/50" onClick={() => setAllSectionsCollapsed(false)}>
              {t.polls.resultsUi.expandSections}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg bg-background/50" onClick={() => setAllTextBlocksExpanded(false)}>
              {t.polls.resultsUi.collapseText}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg bg-background/50" onClick={() => setAllTextBlocksExpanded(true)}>
              {t.polls.resultsUi.expandText}
            </Button>
          </div>
        )}
      </div>
    </GlowCard>
  );

  // Rendering stays centralized here because question types share layout and badges.
  // eslint-disable-next-line complexity
  const renderQuestionCard = (question: PollQuestionResultModel, index: number) => {
    const Icon = QUESTION_TYPE_ICONS[question.question.question_type];
    const textEntries = question.textEntries || [];
    const previewCount = TEXT_PREVIEW_COUNT[variant];
    const isTextExpanded = Boolean(expandedTextBlocks[question.id]);
    const visibleTextEntries = isTextExpanded ? textEntries : textEntries.slice(0, previewCount);
    const globalQuestion = isCohortActive ? globalQuestionMap.get(question.id) : null;
    const aiSummary = isCohortActive ? undefined : aiSummaryMap.get(question.id);
    const cohortRedactionMessage =
      question.cohortRedactionReason === 'text_hidden'
        ? t.polls.resultsUi.cohortTextHidden
        : t.polls.resultsUi.cohortMinimumSample;

    return (
      <GlowCard key={question.id} className="p-5" hoverable={false}>
        <div id={question.anchorId} className="space-y-4 scroll-mt-28">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-primary">{index + 1}.</span>
              <Badge variant="outline" className={cn('gap-1.5', QUESTION_TYPE_COLORS[question.question.question_type])}>
                <Icon className="h-3.5 w-3.5" />
                {getQuestionTypeLabel(question.question.question_type)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'border',
                  question.isCohortRedacted ? 'bg-muted/40 text-muted-foreground border-border' : TONE_BADGE_STYLES[question.tone],
                )}
              >
                {question.isCohortRedacted ? t.polls.resultsUi.cohortRedactedBadge : getToneLabel(question)}
              </Badge>
              <Badge variant="outline" className={NEUTRAL_BADGE_CLASS}>
                {interpolateMessage(t.polls.resultsUi.responsesValue, { count: formatCount(question.responseCount) })}
              </Badge>
              {question.question.condition && (
                <Badge variant="outline" className={cn('text-xs', INFO_BADGE_CLASS)}>
                  <GitBranch className="mr-1 h-3 w-3" />
                  {t.polls.conditionalBadge}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground md:text-lg">{question.question.question_text}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {question.isCohortRedacted ? t.polls.resultsUi.cohortHiddenForAnonymity : getTakeawayText(question)}
              </p>
              {question.isCohortRedacted && (
                <p className="mt-1 text-xs text-muted-foreground">{cohortRedactionMessage}</p>
              )}
              {globalQuestion && (
                <p className="mt-1 text-xs text-muted-foreground/90">
                  {interpolateMessage(t.polls.resultsUi.cohortGlobalReference, {
                    value: getTakeawayText(globalQuestion),
                  })}
                </p>
              )}
            </div>
          </div>

          {question.isCohortRedacted ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4">
              <p className="text-sm text-muted-foreground">{t.polls.resultsUi.cohortHiddenForAnonymity}</p>
            </div>
          ) : (
            <>

          {(question.question.question_type === 'single_choice' ||
            question.question.question_type === 'multiple_choice' ||
            question.question.question_type === 'date' ||
            question.question.question_type === 'time' ||
            question.question.question_type === 'datetime') &&
            question.choiceStats && (
              <div className="space-y-3">
                {question.choiceStats.map((choice) => (
                  <div key={choice.value} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{formatQuestionOptionLabel(question, choice.label)}</span>
                      <span className="whitespace-nowrap text-muted-foreground">{renderChoiceMetric(choice)}</span>
                    </div>
                    <Progress value={choice.percentage} className="h-2 bg-muted/40" />
                    {!poll.is_anonymous && choice.users.length > 0 && (
                      <div className="flex items-center gap-1">
                        {choice.users.slice(0, 6).map((user) => (
                          <Avatar key={`${choice.value}-${user.id}`} className="h-5 w-5">
                            {user.avatar_url ? (
                              <AvatarImage src={user.avatar_url} />
                            ) : (
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                {user.username.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        ))}
                        {choice.users.length > 6 && <span className="text-xs text-muted-foreground">+{formatCount(choice.users.length - 6)}</span>}
                      </div>
                    )}
                    {choice.otherTexts.length > 0 && (
                      <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground">
                        {choice.otherTexts.join(' • ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          {question.question.question_type === 'text' && (
            <div className="space-y-3">
              {renderAiSummary(aiSummary)}
              {textEntries.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">{t.polls.resultsUi.noTextResponses}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {t.polls.resultsUi.aiSummary.rawComments}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {visibleTextEntries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border/70 bg-background/60 p-3">
                        {!poll.is_anonymous && entry.user && (
                          <div className="mb-2 flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {entry.user.avatar_url ? (
                                <AvatarImage src={entry.user.avatar_url} />
                              ) : (
                                <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                                  {entry.user.username.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="text-sm font-medium text-foreground">{entry.user.username}</span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">{entry.value}</p>
                      </div>
                    ))}
                  </div>
                  {textEntries.length > previewCount && (
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleTextBlock(question.id)}>
                      {isTextExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          {t.polls.resultsUi.showLess}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          {t.polls.resultsUi.showMore}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {question.question.question_type === 'rating' && question.ratingRows && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StarDisplay value={question.ratingAverage || 0} max={5} size="lg" />
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {formatNumberLocalized(Number((question.ratingAverage || 0).toFixed(1)), language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {question.ratingRows.map((row) => (
                  <div key={row.value} className="flex items-center gap-1.5">
                    <div className="w-10 shrink-0 text-left text-xs text-muted-foreground">{row.value} / 5</div>
                    <Progress value={row.percentage} className="h-2 flex-1 bg-muted/40" />
                    <span className="w-20 text-right text-xs text-muted-foreground">{renderChoiceMetric({ value: String(row.value), label: String(row.value), count: row.count, percentage: row.percentage, users: [], otherTexts: [] })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.question.question_type === 'scale' && question.scaleRows && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {formatNumberLocalized(Number((question.scaleAverage || 0).toFixed(1)), language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {formatCount(question.scaleMax || 0)}</span>
                </div>
                {(question.scaleMinLabel || question.scaleMaxLabel) && (
                  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                      <div className="min-w-0 flex flex-1 items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                          {formatCount(question.scaleMin || 0)}
                        </span>
                        {question.scaleMinLabel ? (
                          <p className="truncate leading-snug text-muted-foreground">{question.scaleMinLabel}</p>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex flex-1 items-center justify-end gap-2 text-right">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                          {formatCount(question.scaleMax || 0)}
                        </span>
                        {question.scaleMaxLabel ? (
                          <p className="truncate leading-snug text-muted-foreground">{question.scaleMaxLabel}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                {question.scaleRows.map((row) => (
                  <div key={row.label} className="flex items-center gap-1.5">
                    <div className="w-5 shrink-0 text-left text-xs text-muted-foreground">{row.label}</div>
                    <Progress value={row.percentage} className="h-2 flex-1 bg-muted/40" />
                    <span className="w-20 text-right text-xs text-muted-foreground">{renderChoiceMetric({ value: row.label, label: row.label, count: row.count, percentage: row.percentage, users: [], otherTexts: [] })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.question.question_type === 'ranking' && question.rankingRows && (
            <div className="space-y-2">
              {question.rankingRows.map((row, rankingIndex) => (
                <div key={row.option} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {rankingIndex + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.option}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={row.scorePercentage} className="h-2 flex-1 bg-muted/40" />
                      <span className="text-xs text-muted-foreground">
                        {interpolateMessage(t.polls.resultsUi.scoreValue, {
                          value: formatNumberLocalized(Number(row.averageScore.toFixed(1)), language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
            </>
          )}
        </div>
      </GlowCard>
    );
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderCohortBuilder()}
      {renderCohortContext()}
      {renderControls()}

      {visibleQuestions.length === 0 ? (
        <GlowCard className="p-8 text-center" hoverable={false}>
          <p className="text-sm text-muted-foreground">{t.polls.resultsUi.noVisibleQuestions}</p>
        </GlowCard>
      ) : (
        <div className={cn(isFull && 'xl:grid xl:grid-cols-[minmax(0,1fr)_460px] xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_500px]')}>
          <div className="space-y-5">
            {visibleSections.map((section) => {
              const sectionQuestions = visibleQuestions.filter((question) => question.sectionId === section.id);
              const isCollapsed = Boolean(collapsedSections[section.id]);
              return (
                <Collapsible key={section.id} open={!isCollapsed} onOpenChange={() => toggleSection(section.id)}>
                  <div id={`poll-section-${section.id}`} className="scroll-mt-24 space-y-4">
                    <GlowCard className="p-4" hoverable={false}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-foreground">{getSectionTitle(section)}</h2>
                            <Badge variant="outline" className={NEUTRAL_BADGE_CLASS}>
                              {getSectionSummaryText(section)}
                            </Badge>
                          </div>
                          {section.description && <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>}
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button type="button" size="sm" variant="outline">
                            {isCollapsed ? (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                {t.polls.resultsUi.expandSection}
                              </>
                            ) : (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                {t.polls.resultsUi.collapseSection}
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </GlowCard>
                    <CollapsibleContent className="space-y-4">
                      {sectionQuestions.map((question, index) => renderQuestionCard(question, index))}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
          {isFull && (
            <aside className="hidden xl:block">
              <div className="sticky space-y-3" style={{ top: `${quickNavTopOffset}px` }}>
                <GlowCard className="p-4" hoverable={false}>
                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border',
                          toneCalloutClass('info'),
                        )}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {t.polls.resultsUi.quickNavigation}
                        </p>
                        <p className="mt-1 text-base font-semibold text-foreground">
                          {t.polls.resultsUi.jumpToQuestion}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-4 space-y-4 overflow-y-auto pr-1"
                    style={{ maxHeight: `calc(100vh - ${quickNavTopOffset + 24}px)` }}
                  >
                    {visibleQuestionGroups.map(({ section, questions }) => (
                      <div key={section.id} className="space-y-2">
                        <a
                          href={`#poll-section-${section.id}`}
                          className="block rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                        >
                          {getSectionTitle(section)}
                        </a>
                        <div className="space-y-2">
                          {questions.map((question) => (
                            <a
                              key={question.id}
                              href={`#${question.anchorId}`}
                              className="block rounded-lg border border-border/70 bg-background/40 px-4 py-3 text-[15px] leading-snug text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                            >
                              {question.question.question_text}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlowCard>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};

interface SummaryTileProps {
  label: string;
  value: string;
  helper?: string;
  icon: typeof Users;
}

const SummaryTile = ({ label, value, helper, icon: Icon }: SummaryTileProps) => (
  <div className="rounded-xl border border-border/70 bg-background/50 p-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <p className={cn('mt-3 font-semibold text-foreground', helper ? 'text-sm leading-snug' : 'text-xl')}>{value}</p>
    {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
  </div>
);
