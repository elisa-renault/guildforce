import { useState, useMemo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, Check, Shield, Heart, Swords, X, Clock, CheckCircle2, Armchair,
  XCircle, UserCheck, UserMinus, UserX, Sword, Crosshair, MessageSquare, 
  Hash, RotateCcw, Users, Target, SlidersHorizontal
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedClassName, wowClasses, Role } from '@/data/wowClasses';
import { RosterFilters as RosterFiltersType, ValidationStatus, CommitmentFilter, RangeFilter, RosterSelectionStatus } from '@/types/guild';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { formatLabelValue, interpolateMessage } from '@/i18n/format';
import { resolveSemanticMessage, type SemanticKey } from '@/i18n/semantic';
import { useIsMobile } from '@/hooks/use-mobile';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FilterBar, FilterSearchField, activeFilterControlClassName, filterControlClassName } from '@/components/ui/filter-controls';
import { commitmentTextClass } from '@/lib/design-tokens';

interface RosterFiltersProps {
  filters: RosterFiltersType;
  onFiltersChange: (filters: RosterFiltersType) => void;
  sortSummary?: string;
  actions?: ReactNode;
}


const roleConfig: Record<Role, { icon: typeof Shield; color: string }> = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  dps: { icon: Sword, color: 'text-dps' },
};

const validationConfig: Record<ValidationStatus, { icon: typeof Clock; color: string; bgColor: string }> = {
  pending: { icon: Clock, color: 'text-status-warning', bgColor: 'bg-status-warning/10' },
  approved: { icon: CheckCircle2, color: 'text-status-success', bgColor: 'bg-status-success/10' },
  rejected: { icon: XCircle, color: 'text-status-error', bgColor: 'bg-status-error/10' },
};

const commitmentConfig: Record<CommitmentFilter, { icon: typeof UserCheck; color: string; labelKey: 'confirmed' | 'undecided' | 'withdrawn' }> = {
  confirmed: { icon: UserCheck, color: commitmentTextClass('confirmed'), labelKey: 'confirmed' },
  undecided: { icon: UserMinus, color: commitmentTextClass('undecided'), labelKey: 'undecided' },
  withdrawn: { icon: UserX, color: commitmentTextClass('withdrawn'), labelKey: 'withdrawn' },
};

const rosterDecisionConfig: Record<RosterSelectionStatus, { icon: typeof CheckCircle2; color: string; labelKey: 'selected' | 'bench' | 'notSelected' | 'undecided' }> = {
  selected: { icon: CheckCircle2, color: 'text-status-success', labelKey: 'selected' },
  bench: { icon: Armchair, color: 'text-status-warning', labelKey: 'bench' },
  not_selected: { icon: XCircle, color: 'text-status-error', labelKey: 'notSelected' },
  undecided: { icon: Clock, color: 'text-muted-foreground', labelKey: 'undecided' },
};

const rangeConfig: Record<RangeFilter, { icon: typeof Swords; color: string }> = {
  melee: { icon: Swords, color: 'text-warning' },
  ranged: { icon: Crosshair, color: 'text-info' },
};

// Default/empty filter state
const defaultFilters: RosterFiltersType = {
  roleFilters: [],
  classFilters: [],
  validationFilters: [],
  rosterDecisionFilters: [],
  searchQuery: '',
  filterMode: 'and',
  commitmentFilters: [],
  minWishes: null,
  rangeFilters: [],
  hasComment: null,
  maxWishIndex: null,
};

export const RosterFilters = ({ filters, onFiltersChange, sortSummary, actions }: RosterFiltersProps) => {
  const { t, language } = useLanguage();
  const s = (key: SemanticKey, fallback?: string) =>
    resolveSemanticMessage({ key, language: t.lang, translations: t, fallback });
  const isMobile = useIsMobile();
  const [playersOpen, setPlayersOpen] = useState(false);
  const [wishesOpen, setWishesOpen] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const updateFilter = <K extends keyof RosterFiltersType>(key: K, value: RosterFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const resetAllFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const toggleRole = (role: string) => {
    const current = filters.roleFilters;
    if (current.includes(role)) {
      updateFilter('roleFilters', current.filter(r => r !== role));
    } else {
      updateFilter('roleFilters', [...current, role]);
    }
  };

  const toggleClass = (classId: string) => {
    const current = filters.classFilters;
    if (current.includes(classId)) {
      updateFilter('classFilters', current.filter(c => c !== classId));
    } else {
      updateFilter('classFilters', [...current, classId]);
    }
  };

  const toggleValidation = (status: ValidationStatus) => {
    const current = filters.validationFilters;
    if (current.includes(status)) {
      updateFilter('validationFilters', current.filter(s => s !== status));
    } else {
      updateFilter('validationFilters', [...current, status]);
    }
  };

  const toggleCommitment = (commitment: CommitmentFilter) => {
    const current = filters.commitmentFilters;
    if (current.includes(commitment)) {
      updateFilter('commitmentFilters', current.filter(c => c !== commitment));
    } else {
      updateFilter('commitmentFilters', [...current, commitment]);
    }
  };

  const toggleRosterDecision = (decision: RosterSelectionStatus) => {
    const current = filters.rosterDecisionFilters;
    if (current.includes(decision)) {
      updateFilter('rosterDecisionFilters', current.filter(d => d !== decision));
    } else {
      updateFilter('rosterDecisionFilters', [...current, decision]);
    }
  };

  const toggleRange = (range: RangeFilter) => {
    const current = filters.rangeFilters;
    if (current.includes(range)) {
      updateFilter('rangeFilters', current.filter(r => r !== range));
    } else {
      updateFilter('rangeFilters', [...current, range]);
    }
  };

  // Count active filters per group
  const playersFilterCount = filters.commitmentFilters.length + filters.rosterDecisionFilters.length;
  const wishesFilterCount = 
    (filters.maxWishIndex !== null ? 1 : 0) +
    (filters.minWishes !== null ? 1 : 0) +
    filters.validationFilters.length +
    (filters.hasComment !== null ? 1 : 0);
  const specsFilterCount = 
    filters.roleFilters.length +
    filters.rangeFilters.length +
    filters.classFilters.length;

  const hasPlayersFilters = playersFilterCount > 0;
  const hasWishesFilters = wishesFilterCount > 0;
  const hasSpecsFilters = specsFilterCount > 0;
  const hasSearchQuery = filters.searchQuery.length > 0;
  const hasAnyFilters = hasPlayersFilters || hasWishesFilters || hasSpecsFilters;

  const getPillToneClass = (color?: string) => {
    switch (color) {
      case 'text-status-success':
      case 'text-healer':
        return 'bg-status-success/12 border-status-success/35';
      case 'text-status-warning':
      case 'text-warning':
        return 'bg-status-warning/12 border-status-warning/35';
      case 'text-status-error':
        return 'bg-status-error/12 border-status-error/35';
      case 'text-status-info':
        return 'bg-status-info/12 border-status-info/35';
      case 'text-primary':
        return 'bg-primary/12 border-primary/35';
      case 'text-info':
        return 'bg-info/12 border-info/35';
      case 'text-tank':
        return 'bg-tank/12 border-tank/35';
      case 'text-dps':
        return 'bg-dps/12 border-dps/35';
      default:
        return 'bg-muted/25 border-border/60';
    }
  };

  // Generate active filter pills for display
  const activePills = useMemo(() => {
    const pills: { key: string; label: string; color?: string; onRemove: () => void }[] = [];

    // Commitment pills
    filters.commitmentFilters.forEach(c => {
      const config = commitmentConfig[c];
      pills.push({
        key: `commitment-${c}`,
        label: t.wishes.commitment[config.labelKey],
        color: config.color,
        onRemove: () => toggleCommitment(c),
      });
    });

    // Roster decision pills
    filters.rosterDecisionFilters.forEach((decision) => {
      const config = rosterDecisionConfig[decision];
      pills.push({
        key: `roster-decision-${decision}`,
        label: t.wishes.rosterDecision[config.labelKey],
        color: config.color,
        onRemove: () => toggleRosterDecision(decision),
      });
    });

    // Wish range pill
    if (filters.maxWishIndex !== null) {
      const label = filters.maxWishIndex === 1 
        ? t.dashboard.wishRange1 
        : interpolateMessage(t.dashboard.wishRangeN, { n: filters.maxWishIndex });
      pills.push({
        key: 'maxWishIndex',
        label,
        onRemove: () => updateFilter('maxWishIndex', null),
      });
    }

    // Min wishes pill
    if (filters.minWishes !== null) {
      pills.push({
        key: 'minWishes',
        label: `>=${filters.minWishes} ${s('dashboard.roster_filters.wishes_suffix')}`,
        onRemove: () => updateFilter('minWishes', null),
      });
    }

    // Validation pills
    filters.validationFilters.forEach(v => {
      const config = validationConfig[v];
      pills.push({
        key: `validation-${v}`,
        label: t.wishes.validation[v],
        color: config.color,
        onRemove: () => toggleValidation(v),
      });
    });

    // Comment pill
    if (filters.hasComment !== null) {
      pills.push({
        key: 'comment',
        label: filters.hasComment ? t.dashboard.withComment : t.dashboard.withoutComment,
        onRemove: () => updateFilter('hasComment', null),
      });
    }

    // Role pills
    filters.roleFilters.forEach(r => {
      const config = roleConfig[r as Role];
      if (config) {
        pills.push({
          key: `role-${r}`,
          label: t.dashboard[r as Role],
          color: config.color,
          onRemove: () => toggleRole(r),
        });
      }
    });

    // Range pills
    filters.rangeFilters.forEach(r => {
      const config = rangeConfig[r];
      pills.push({
        key: `range-${r}`,
        label: t.dashboard[r],
        color: config.color,
        onRemove: () => toggleRange(r),
      });
    });

    // Class pills
    filters.classFilters.forEach(classId => {
      const cls = wowClasses.find(c => c.id === classId);
      if (cls) {
        pills.push({
          key: `class-${classId}`,
          label: getLocalizedClassName(cls.id, language),
          color: `hsl(var(--class-${classId}))`,
          onRemove: () => toggleClass(classId),
        });
      }
    });

    return pills;
  }, [filters, language, t]);
  const activeFilterCount = activePills.length;

  if (isMobile) {
    return (
      <div className="mb-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <FilterSearchField
            placeholder={t.common.search}
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            containerClassName="min-w-0 flex-1"
            className="h-10"
          />

          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  filterControlClassName,
                  'h-10 gap-2 px-3',
                  activeFilterCount > 0 && activeFilterControlClassName
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t.dashboard.filters}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[82vh] rounded-t-2xl border-border bg-card/95 px-0 pb-0">
              <SheetHeader className="px-4 pt-4 text-left">
                <SheetTitle>{t.dashboard.filters}</SheetTitle>
                <SheetDescription>{s('dashboard.roster_filters.active_label')}</SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-3 h-[calc(82vh-9.5rem)] px-4">
                <div className="space-y-4 pb-6">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={filters.commitmentFilters.includes('confirmed') ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => toggleCommitment('confirmed')}
                    >
                      {t.wishes.commitment.confirmed}
                    </Button>
                    <Button
                      variant={filters.validationFilters.includes('approved') ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => toggleValidation('approved')}
                    >
                      {t.wishes.validation.approved}
                    </Button>
                    <Button
                      variant={filters.rosterDecisionFilters.includes('selected') ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => toggleRosterDecision('selected')}
                    >
                      {t.wishes.rosterDecision.selected}
                    </Button>
                  </div>

                  <Accordion type="multiple" defaultValue={['players', 'wishes']} className="space-y-2">
                    <AccordionItem value="players" className="rounded-lg border border-border/50 bg-background/40 px-3">
                      <AccordionTrigger className="py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{t.guild.members}</span>
                          {hasPlayersFilters && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                              {playersFilterCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-3">
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.dashboard.commitment}</h4>
                          <div className="grid grid-cols-1 gap-1.5">
                            {(Object.keys(commitmentConfig) as CommitmentFilter[]).map((commitment) => {
                              const config = commitmentConfig[commitment];
                              const Icon = config.icon;
                              const isSelected = filters.commitmentFilters.includes(commitment);
                              return (
                                <Button
                                  key={commitment}
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn('h-9 justify-start gap-2 text-xs', !isSelected && config.color)}
                                  onClick={() => toggleCommitment(commitment)}
                                >
                                  <Icon className="h-4 w-4" />
                                  {t.wishes.commitment[config.labelKey]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.wishes.rosterDecision.title}</h4>
                          <div className="grid grid-cols-1 gap-1.5">
                            {(Object.keys(rosterDecisionConfig) as RosterSelectionStatus[]).map((decision) => {
                              const config = rosterDecisionConfig[decision];
                              const Icon = config.icon;
                              const isSelected = filters.rosterDecisionFilters.includes(decision);
                              return (
                                <Button
                                  key={decision}
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn('h-9 justify-start gap-2 text-xs', !isSelected && config.color)}
                                  onClick={() => toggleRosterDecision(decision)}
                                >
                                  <Icon className="h-4 w-4" />
                                  {t.wishes.rosterDecision[config.labelKey]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="wishes" className="rounded-lg border border-border/50 bg-background/40 px-3">
                      <AccordionTrigger className="py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>{s('dashboard.roster_filters.wishes_title')}</span>
                          {hasWishesFilters && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                              {wishesFilterCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-3">
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.dashboard.validation}</h4>
                          <div className="grid grid-cols-1 gap-1.5">
                            {(Object.keys(validationConfig) as ValidationStatus[]).map((status) => {
                              const config = validationConfig[status];
                              const Icon = config.icon;
                              const isSelected = filters.validationFilters.includes(status);
                              return (
                                <Button
                                  key={status}
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn('h-9 justify-start gap-2 text-xs', !isSelected && config.color)}
                                  onClick={() => toggleValidation(status)}
                                >
                                  <Icon className="h-4 w-4" />
                                  {t.wishes.validation[status]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={filters.maxWishIndex === 1 ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => updateFilter('maxWishIndex', filters.maxWishIndex === 1 ? null : 1)}
                          >
                            {t.dashboard.wishRange1}
                          </Button>
                          <Button
                            variant={filters.maxWishIndex === 2 ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => updateFilter('maxWishIndex', filters.maxWishIndex === 2 ? null : 2)}
                          >
                            {interpolateMessage(t.dashboard.wishRangeN, { n: 2 })}
                          </Button>
                          <Button
                            variant={filters.minWishes === 1 ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => updateFilter('minWishes', filters.minWishes === 1 ? null : 1)}
                          >
                            &gt;=1
                          </Button>
                          <Button
                            variant={filters.hasComment === true ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => updateFilter('hasComment', filters.hasComment === true ? null : true)}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {t.dashboard.withComment}
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="specs" className="rounded-lg border border-border/50 bg-background/40 px-3">
                      <AccordionTrigger className="py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{t.wishes.specs}</span>
                          {hasSpecsFilters && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                              {specsFilterCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pb-3">
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s('dashboard.roster_filters.roles_title')}</h4>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(Object.keys(roleConfig) as Role[]).map((role) => {
                              const config = roleConfig[role];
                              const Icon = config.icon;
                              const isSelected = filters.roleFilters.includes(role);
                              return (
                                <Button
                                  key={role}
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn('h-8 gap-1 px-2 text-xs', !isSelected && config.color)}
                                  onClick={() => toggleRole(role)}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {t.dashboard[role]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.dashboard.range}</h4>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(['melee', 'ranged'] as RangeFilter[]).map((range) => {
                              const config = rangeConfig[range];
                              const Icon = config.icon;
                              const isSelected = filters.rangeFilters.includes(range);
                              return (
                                <Button
                                  key={range}
                                  variant={isSelected ? 'default' : 'outline'}
                                  size="sm"
                                  className={cn('h-8 gap-1 px-2 text-xs', !isSelected && config.color)}
                                  onClick={() => toggleRange(range)}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {t.dashboard[range]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{s('dashboard.roster_filters.classes_title')}</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {wowClasses.map((cls) => {
                              const isSelected = filters.classFilters.includes(cls.id);
                              return (
                                <button
                                  key={cls.id}
                                  onClick={() => toggleClass(cls.id)}
                                  className={cn(
                                    'rounded-md border px-2 py-1 text-[11px] transition-colors',
                                    isSelected ? 'border-primary/50 bg-primary/15' : 'border-border/40 bg-background/40'
                                  )}
                                  style={{ color: `hsl(var(--class-${cls.id}))` }}
                                >
                                  {getLocalizedClassName(cls.id, language)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>

              <div className="border-t border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="h-9 flex-1" onClick={resetAllFilters} disabled={!hasAnyFilters}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t.common.reset}
                  </Button>
                  <Button className="h-9 flex-1" onClick={() => setMobileFiltersOpen(false)}>
                    {t.common.close}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.commitmentFilters.includes('confirmed') ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => toggleCommitment('confirmed')}
          >
            {t.wishes.commitment.confirmed}
          </Button>
          <Button
            variant={filters.validationFilters.includes('approved') ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => toggleValidation('approved')}
          >
            {t.wishes.validation.approved}
          </Button>
          <Button
            variant={filters.rosterDecisionFilters.includes('selected') ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => toggleRosterDecision('selected')}
          >
            {t.wishes.rosterDecision.selected}
          </Button>
        </div>

        {activePills.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-1">
              {activePills.map((pill) => (
                <Badge
                  key={pill.key}
                  variant="outline"
                  className={cn(
                    'h-6 gap-1 rounded-full pl-2 pr-1 transition-colors',
                    getPillToneClass(pill.color)
                  )}
                  style={pill.color?.startsWith('hsl') ? { color: pill.color } : undefined}
                  onClick={pill.onRemove}
                >
                  <span className={cn('text-[11px]', pill.color && !pill.color.startsWith('hsl') && pill.color)}>
                    {pill.label}
                  </span>
                  <X className="h-3 w-3 opacity-60" />
                </Badge>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Row 1: Search + Filter Groups + Reset */}
      <FilterBar className="mb-0">
        {/* Search */}
        <FilterSearchField
          placeholder={t.common.search}
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          containerClassName="w-full sm:w-[200px] flex-none"
        />
        {/* Players Group */}
        <Popover open={playersOpen} onOpenChange={setPlayersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                "gap-2",
                hasPlayersFilters 
                  ? activeFilterControlClassName
                  : "text-muted-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              <span>{t.guild.members}</span>
              {hasPlayersFilters && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {playersFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto min-w-40 p-3 bg-card border-border z-50" align="start">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.commitment}</h4>
                <div className="flex flex-col gap-1">
                  {(Object.keys(commitmentConfig) as CommitmentFilter[]).map((commitment) => {
                    const config = commitmentConfig[commitment];
                    const Icon = config.icon;
                    const isSelected = filters.commitmentFilters.includes(commitment);
                    
                    return (
                      <button
                        key={commitment}
                        onClick={() => toggleCommitment(commitment)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                          isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className={cn("flex-1", config.color)}>{t.wishes.commitment[config.labelKey]}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">{t.wishes.rosterDecision.title}</h4>
                <div className="flex flex-col gap-1">
                  {(Object.keys(rosterDecisionConfig) as RosterSelectionStatus[]).map((decision) => {
                    const config = rosterDecisionConfig[decision];
                    const Icon = config.icon;
                    const isSelected = filters.rosterDecisionFilters.includes(decision);

                    return (
                      <button
                        key={decision}
                        onClick={() => toggleRosterDecision(decision)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                          isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className={cn("flex-1", config.color)}>{t.wishes.rosterDecision[config.labelKey]}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {hasPlayersFilters && (
                <button
                  onClick={() => onFiltersChange({ ...filters, commitmentFilters: [], rosterDecisionFilters: [] })}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 w-full"
                >
                  <X className="h-3.5 w-3.5" />
                  {t.dashboard.clear}
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Wishes Group */}
        <Popover open={wishesOpen} onOpenChange={setWishesOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                "gap-2",
                hasWishesFilters 
                  ? activeFilterControlClassName
                  : "text-muted-foreground"
              )}
            >
              <Hash className="h-4 w-4" />
              <span>{t.dashboard.wishesCount}</span>
              {hasWishesFilters && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {wishesFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-card border-border z-50" align="start">
            <div className="space-y-4">
              {/* Wish Range */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.wishRangeFilter}</h4>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant={filters.maxWishIndex === null ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateFilter('maxWishIndex', null)}
                  >
                    {t.dashboard.allWishes}
                  </Button>
                  {[1, 3, 5].map(n => (
                    <Button
                      key={n}
                      variant={filters.maxWishIndex === n ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateFilter('maxWishIndex', n)}
                    >
                      {n === 1 ? t.dashboard.wishRange1 : interpolateMessage(t.dashboard.wishRangeN, { n })}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Min Wishes */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.minWishes}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {[null, 1, 2, 3, 5].map(n => (
                    <Button
                      key={n ?? 'any'}
                      variant={filters.minWishes === n ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateFilter('minWishes', n)}
                    >
                      {n === null ? t.common.all : `>=${n}`}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Validation */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.validation}</h4>
                <div className="flex flex-col gap-1">
                  {(Object.keys(validationConfig) as ValidationStatus[]).map((status) => {
                    const config = validationConfig[status];
                    const Icon = config.icon;
                    const isSelected = filters.validationFilters.includes(status);
                    
                    return (
                      <button
                        key={status}
                        onClick={() => toggleValidation(status)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                          isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                        )}
                      >
                        <div className={cn("w-4 h-4 flex items-center justify-center", isSelected && "text-primary")}>
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className={config.color}>{t.wishes.validation[status]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.comments}</h4>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant={filters.hasComment === null ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateFilter('hasComment', null)}
                  >
                    {t.common.all}
                  </Button>
                  <Button
                    variant={filters.hasComment === true ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => updateFilter('hasComment', true)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    {t.dashboard.withComment}
                  </Button>
                  <Button
                    variant={filters.hasComment === false ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateFilter('hasComment', false)}
                  >
                    {t.dashboard.withoutComment}
                  </Button>
                </div>
              </div>

              {hasWishesFilters && (
                <>
                  <Separator />
                  <button
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        maxWishIndex: null,
                        minWishes: null,
                        validationFilters: [],
                        hasComment: null,
                      });
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 w-full"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.dashboard.clear}
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Specs Group */}
        <Popover open={specsOpen} onOpenChange={setSpecsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                filterControlClassName,
                "gap-2",
                hasSpecsFilters 
                  ? activeFilterControlClassName
                  : "text-muted-foreground"
              )}
            >
              <Target className="h-4 w-4" />
              <span>{t.wishes.specs}</span>
              {hasSpecsFilters && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {specsFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[22rem] max-w-[calc(100vw-1rem)] p-3 bg-card border-border z-50" align="start">
            <div className="space-y-4">
              {/* Roles */}
              <div>
                <h4 className="text-sm font-medium mb-2">{s('dashboard.roster_filters.roles_title')}</h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(roleConfig) as Role[]).map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    const isSelected = filters.roleFilters.includes(role);
                    
                    return (
                      <Button
                        key={role}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 w-full min-w-0 gap-1.5 px-2", !isSelected && config.color)}
                        onClick={() => toggleRole(role)}
                      >
                        <Icon className="h-4 w-4" />
                        {t.dashboard[role]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Range */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.range}</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['melee', 'ranged'] as RangeFilter[]).map((range) => {
                    const config = rangeConfig[range];
                    const Icon = config.icon;
                    const isSelected = filters.rangeFilters.includes(range);
                    
                    return (
                      <Button
                        key={range}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 w-full min-w-0 gap-1.5 px-2", !isSelected && config.color)}
                        onClick={() => toggleRange(range)}
                      >
                        <Icon className="h-4 w-4" />
                        {t.dashboard[range]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Classes */}
              <div>
                <h4 className="text-sm font-medium mb-2">{s('dashboard.roster_filters.classes_title')}</h4>
                <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                  {wowClasses.map((cls) => {
                    const isSelected = filters.classFilters.includes(cls.id);
                    
                    return (
                      <button
                        key={cls.id}
                        onClick={() => toggleClass(cls.id)}
                        className={cn(
                          "px-2 py-1 rounded text-xs transition-colors whitespace-nowrap",
                          isSelected 
                            ? "bg-primary/30 ring-1 ring-primary/50" 
                            : "hover:bg-primary/10"
                        )}
                        style={{ color: `hsl(var(--class-${cls.id}))` }}
                      >
                        {getLocalizedClassName(cls.id, language)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {hasSpecsFilters && (
                <>
                  <Separator />
                  <button
                    onClick={() => {
                      onFiltersChange({
                        ...filters,
                        roleFilters: [],
                        rangeFilters: [],
                        classFilters: [],
                      });
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 w-full"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t.dashboard.clear}
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Button */}
        {hasAnyFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAllFilters}
            className="h-8 gap-1.5 rounded px-2.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.common.reset}</span>
          </Button>
        )}
        {actions && (
          <div className="ml-auto hidden shrink-0 items-center lg:flex">
            {actions}
          </div>
        )}
      </FilterBar>

      {/* Row 3: Sort and active filter pills */}
      {(sortSummary || activePills.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {sortSummary && (
            <Badge variant="outline" className="h-6 border-primary/30 bg-primary/10 px-2 text-xs font-medium text-primary">
              {formatLabelValue(t.dashboard.rosterTable.sortLabel, sortSummary, t.lang)}
            </Badge>
          )}
          {activePills.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {s('dashboard.roster_filters.active_label')}
            </span>
          )}
          {activePills.map((pill) => (
            <Badge
              key={pill.key}
              variant="outline"
              className={cn(
                "h-6 gap-1 pl-2 pr-1 cursor-pointer border transition-colors",
                getPillToneClass(pill.color)
              )}
              style={pill.color?.startsWith('hsl') ? { color: pill.color } : undefined}
              onClick={pill.onRemove}
            >
              <span className={cn("text-xs", pill.color && !pill.color.startsWith('hsl') && pill.color)}>
                {pill.label}
              </span>
              <X className="h-3 w-3 opacity-60 hover:opacity-100" />
            </Badge>
          ))}
          {activePills.length > 0 && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {s('dashboard.roster_filters.clear_all')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

