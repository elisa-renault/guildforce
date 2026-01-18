import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Search, ChevronDown, Check, Shield, Heart, Swords, X, Clock, CheckCircle2, 
  XCircle, UserCheck, UserMinus, UserX, Sword, Crosshair, MessageSquare, 
  Hash, RotateCcw, Users, Target
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, Role } from '@/data/wowClasses';
import { RosterFilters as RosterFiltersType, ValidationStatus, CommitmentFilter, RangeFilter } from '@/types/guild';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface RosterFiltersProps {
  filters: RosterFiltersType;
  onFiltersChange: (filters: RosterFiltersType) => void;
}


const roleConfig: Record<Role, { icon: typeof Shield; color: string; label: { en: string; fr: string } }> = {
  tank: { icon: Shield, color: 'text-tank', label: { en: 'Tank', fr: 'Tank' } },
  healer: { icon: Heart, color: 'text-healer', label: { en: 'Healer', fr: 'Healer' } },
  dps: { icon: Sword, color: 'text-dps', label: { en: 'DPS', fr: 'DPS' } },
};

const validationConfig: Record<ValidationStatus, { icon: typeof Clock; color: string; bgColor: string; label: { en: string; fr: string } }> = {
  pending: { icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-400/10', label: { en: 'Pending', fr: 'En attente' } },
  approved: { icon: CheckCircle2, color: 'text-healer', bgColor: 'bg-healer/10', label: { en: 'Approved', fr: 'Approuvé' } },
  rejected: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: { en: 'Rejected', fr: 'Refusé' } },
};

const commitmentConfig: Record<CommitmentFilter, { icon: typeof UserCheck; color: string; labelKey: 'confirmed' | 'undecided' | 'withdrawn' }> = {
  confirmed: { icon: UserCheck, color: 'text-healer', labelKey: 'confirmed' },
  undecided: { icon: UserMinus, color: 'text-amber-400', labelKey: 'undecided' },
  withdrawn: { icon: UserX, color: 'text-destructive', labelKey: 'withdrawn' },
};

const rangeConfig: Record<RangeFilter, { icon: typeof Swords; color: string }> = {
  melee: { icon: Swords, color: 'text-orange-400' },
  ranged: { icon: Crosshair, color: 'text-sky-400' },
};

// Default/empty filter state
const defaultFilters: RosterFiltersType = {
  roleFilters: [],
  classFilters: [],
  validationFilters: [],
  searchQuery: '',
  filterMode: 'and',
  commitmentFilters: [],
  minWishes: null,
  rangeFilters: [],
  hasComment: null,
  maxWishIndex: null,
};

export const RosterFilters = ({ filters, onFiltersChange }: RosterFiltersProps) => {
  const { t, language } = useLanguage();
  const [playersOpen, setPlayersOpen] = useState(false);
  const [wishesOpen, setWishesOpen] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);

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

  const toggleRange = (range: RangeFilter) => {
    const current = filters.rangeFilters;
    if (current.includes(range)) {
      updateFilter('rangeFilters', current.filter(r => r !== range));
    } else {
      updateFilter('rangeFilters', [...current, range]);
    }
  };

  // Count active filters per group
  const playersFilterCount = filters.commitmentFilters.length;
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

    // Wish range pill
    if (filters.maxWishIndex !== null) {
      const label = filters.maxWishIndex === 1 
        ? t.dashboard.wishRange1 
        : t.dashboard.wishRangeN.replace('{{n}}', filters.maxWishIndex.toString());
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
        label: `≥${filters.minWishes} ${language === 'fr' ? 'vœux' : 'wishes'}`,
        onRemove: () => updateFilter('minWishes', null),
      });
    }

    // Validation pills
    filters.validationFilters.forEach(v => {
      const config = validationConfig[v];
      pills.push({
        key: `validation-${v}`,
        label: config.label[language],
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
          label: config.label[language],
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
          label: cls.name[language],
          color: `hsl(var(--class-${classId}))`,
          onRemove: () => toggleClass(classId),
        });
      }
    });

    return pills;
  }, [filters, language, t]);

  return (
    <div className="flex flex-col gap-3 mb-4">
      {/* Row 1: Search + Filter Groups + Reset */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-[200px] flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder={t.common.search}
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="h-9 pl-8 text-sm cosmic-input"
          />
        </div>
        {/* Players Group */}
        <Popover open={playersOpen} onOpenChange={setPlayersOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2 text-sm",
                hasPlayersFilters 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border/40 text-muted-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              <span>{language === 'fr' ? 'Joueurs' : 'Players'}</span>
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
              {hasPlayersFilters && (
                <button
                  onClick={() => updateFilter('commitmentFilters', [])}
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
                "h-9 gap-2 text-sm",
                hasWishesFilters 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border/40 text-muted-foreground"
              )}
            >
              <Hash className="h-4 w-4" />
              <span>{language === 'fr' ? 'Vœux' : 'Wishes'}</span>
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
                      {n === 1 ? t.dashboard.wishRange1 : t.dashboard.wishRangeN.replace('{{n}}', n.toString())}
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
                      {n === null ? t.common.all : `≥${n}`}
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
                        <span className={config.color}>{config.label[language]}</span>
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
                "h-9 gap-2 text-sm",
                hasSpecsFilters 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-border/40 text-muted-foreground"
              )}
            >
              <Target className="h-4 w-4" />
              <span>{language === 'fr' ? 'Spécialités' : 'Specs'}</span>
              {hasSpecsFilters && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {specsFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 bg-card border-border z-50" align="start">
            <div className="space-y-4">
              {/* Roles */}
              <div>
                <h4 className="text-sm font-medium mb-2">{language === 'fr' ? 'Rôles' : 'Roles'}</h4>
                <div className="flex gap-1.5">
                  {(Object.keys(roleConfig) as Role[]).map((role) => {
                    const config = roleConfig[role];
                    const Icon = config.icon;
                    const isSelected = filters.roleFilters.includes(role);
                    
                    return (
                      <Button
                        key={role}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 gap-1.5", !isSelected && config.color)}
                        onClick={() => toggleRole(role)}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label[language]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Range */}
              <div>
                <h4 className="text-sm font-medium mb-2">{t.dashboard.range}</h4>
                <div className="flex gap-1.5">
                  {(['melee', 'ranged'] as RangeFilter[]).map((range) => {
                    const config = rangeConfig[range];
                    const Icon = config.icon;
                    const isSelected = filters.rangeFilters.includes(range);
                    
                    return (
                      <Button
                        key={range}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={cn("h-8 gap-1.5", !isSelected && config.color)}
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
                <h4 className="text-sm font-medium mb-2">{language === 'fr' ? 'Classes' : 'Classes'}</h4>
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
                        {cls.name[language]}
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
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t.common.reset}</span>
          </Button>
        )}
      </div>

      {/* Row 3: Active Filter Pills */}
      {activePills.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {language === 'fr' ? 'Actifs :' : 'Active:'}
          </span>
          {activePills.map((pill) => (
            <Badge
              key={pill.key}
              variant="secondary"
              className="h-6 gap-1 pl-2 pr-1 cursor-pointer hover:bg-secondary/80"
              style={pill.color?.startsWith('hsl') ? { color: pill.color } : undefined}
              onClick={pill.onRemove}
            >
              <span className={cn("text-xs", pill.color && !pill.color.startsWith('hsl') && pill.color)}>
                {pill.label}
              </span>
              <X className="h-3 w-3 opacity-60 hover:opacity-100" />
            </Badge>
          ))}
          <button
            onClick={resetAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {language === 'fr' ? 'Tout effacer' : 'Clear all'}
          </button>
        </div>
      )}
    </div>
  );
};
