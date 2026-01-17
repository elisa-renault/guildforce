import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, ChevronDown, Check, Shield, Heart, Swords, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, Role } from '@/data/wowClasses';
import { RosterFilters as RosterFiltersType, ValidationStatus } from '@/types/guild';
import { cn } from '@/lib/utils';

interface RosterFiltersProps {
  filters: RosterFiltersType;
  onFiltersChange: (filters: RosterFiltersType) => void;
}

const roleConfig: Record<Role, { icon: typeof Shield; color: string; label: { en: string; fr: string } }> = {
  tank: { icon: Shield, color: 'text-tank', label: { en: 'Tank', fr: 'Tank' } },
  healer: { icon: Heart, color: 'text-healer', label: { en: 'Healer', fr: 'Healer' } },
  dps: { icon: Swords, color: 'text-dps', label: { en: 'DPS', fr: 'DPS' } },
};

const validationConfig: Record<ValidationStatus, { icon: typeof Clock; color: string; bgColor: string; label: { en: string; fr: string } }> = {
  pending: { icon: Clock, color: 'text-amber-400', bgColor: 'bg-amber-400/10', label: { en: 'Pending', fr: 'En attente' } },
  approved: { icon: CheckCircle2, color: 'text-healer', bgColor: 'bg-healer/10', label: { en: 'Approved', fr: 'Approuvé' } },
  rejected: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: { en: 'Rejected', fr: 'Refusé' } },
};

export const RosterFilters = ({ filters, onFiltersChange }: RosterFiltersProps) => {
  const { t, language } = useLanguage();
  const [roleOpen, setRoleOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);

  const updateFilter = <K extends keyof RosterFiltersType>(key: K, value: RosterFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
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

  const selectedClasses = wowClasses.filter(c => filters.classFilters.includes(c.id));
  const hasRoleFilters = filters.roleFilters.length > 0;
  const hasClassFilters = filters.classFilters.length > 0;
  const hasValidationFilters = filters.validationFilters.length > 0;
  const hasAnyFilters = hasRoleFilters || hasClassFilters || hasValidationFilters;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Search - full width on mobile */}
      <div className="relative w-full md:max-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder={t.common.search}
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="h-9 md:h-8 pl-8 text-sm cosmic-input"
        />
      </div>
      
      {/* Filters row - horizontal scroll on mobile */}
      <div className="flex gap-2 items-center overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap">

      {/* Role Filter */}
      <Popover open={roleOpen} onOpenChange={setRoleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 md:h-8 min-w-[120px] md:min-w-[140px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap",
              hasRoleFilters 
                ? "border-border/60" 
                : "border-border/40 text-muted-foreground"
            )}
          >
            {hasRoleFilters ? (
              <span className="flex items-center gap-1.5">
                {filters.roleFilters.map((role) => {
                  const config = roleConfig[role as Role];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <span key={role} className="flex items-center gap-1">
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className="hidden md:inline">{config.label[language]}</span>
                    </span>
                  );
                })}
              </span>
            ) : (
              <span>{t.dashboard.allRoles}</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 bg-card border-border z-50" align="start">
          <div className="flex flex-col gap-0.5">
            {hasRoleFilters && (
              <button
                onClick={() => updateFilter('roleFilters', [])}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t.dashboard.clear}</span>
              </button>
            )}
            {(Object.keys(roleConfig) as Role[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              const isSelected = filters.roleFilters.includes(role);
              
              return (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                    isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span>{config.label[language]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Class Filter */}
      <Popover open={classOpen} onOpenChange={setClassOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 md:h-8 min-w-[130px] md:min-w-[200px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap",
              hasClassFilters 
                ? "border-border/60" 
                : "border-border/40 text-muted-foreground"
            )}
          >
            {hasClassFilters ? (
              <span className="flex items-center gap-1.5">
                {selectedClasses.length <= 2 ? (
                  selectedClasses.map((cls) => (
                    <span 
                      key={cls.id} 
                      style={{ color: `hsl(var(--class-${cls.id}))` }}
                      className="truncate max-w-[60px] md:max-w-none"
                    >
                      {cls.name[language]}
                    </span>
                  ))
                ) : (
                  <span>
                    {selectedClasses.length} {t.dashboard.classesCount}
                  </span>
                )}
              </span>
            ) : (
              <span>{t.dashboard.allClasses}</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1.5 bg-card border-border z-50" align="start">
          <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto">
            {hasClassFilters && (
              <button
                onClick={() => updateFilter('classFilters', [])}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t.dashboard.clear}</span>
              </button>
            )}
            {wowClasses.map((cls) => {
              const isSelected = filters.classFilters.includes(cls.id);
              
              return (
                <button
                  key={cls.id}
                  onClick={() => toggleClass(cls.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                    isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                  )}
                  style={{ color: `hsl(var(--class-${cls.id}))` }}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span>{cls.name[language]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Validation Filter */}
      <Popover open={validationOpen} onOpenChange={setValidationOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 md:h-8 min-w-[110px] md:min-w-[140px] justify-between gap-2 text-sm flex-shrink-0 whitespace-nowrap",
              hasValidationFilters 
                ? "border-border/60" 
                : "border-border/40 text-muted-foreground"
            )}
          >
            {hasValidationFilters ? (
              <span className="flex items-center gap-1.5">
                {filters.validationFilters.map((status) => {
                  const config = validationConfig[status];
                  const Icon = config.icon;
                  return (
                    <span key={status} className="flex items-center gap-1">
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className={cn("hidden md:inline", config.color)}>{config.label[language]}</span>
                    </span>
                  );
                })}
              </span>
            ) : (
              <span>{t.dashboard.validation}</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5 bg-card border-border z-50" align="start">
          <div className="flex flex-col gap-0.5">
            {hasValidationFilters && (
              <button
                onClick={() => updateFilter('validationFilters', [])}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left hover:bg-primary/10 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t.dashboard.clear}</span>
              </button>
            )}
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
                  {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span className={config.color}>{config.label[language]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* AND/OR Toggle - only show when multiple filters are selected */}
      {hasAnyFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateFilter('filterMode', filters.filterMode === 'and' ? 'or' : 'and')}
          className="h-9 md:h-8 px-2 text-xs font-mono text-muted-foreground hover:text-foreground flex-shrink-0"
        >
          {filters.filterMode === 'and' ? 'ET' : 'OU'}
        </Button>
      )}
      </div>
    </div>
  );
};
