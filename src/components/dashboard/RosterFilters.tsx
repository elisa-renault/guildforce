import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, ChevronDown, Check, Shield, Heart, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, Role } from '@/data/wowClasses';
import { RosterFilters as RosterFiltersType } from '@/types/guild';
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

export const RosterFilters = ({ filters, onFiltersChange }: RosterFiltersProps) => {
  const { t, language } = useLanguage();
  const [roleOpen, setRoleOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);

  const updateFilter = <K extends keyof RosterFiltersType>(key: K, value: RosterFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const selectedClass = filters.classFilter !== 'all' 
    ? wowClasses.find(c => c.id === filters.classFilter) 
    : null;

  const selectedRole = filters.roleFilter !== 'all' 
    ? roleConfig[filters.roleFilter as Role] 
    : null;

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      {/* Search */}
      <div className="relative flex-1 sm:max-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder={t.common.search}
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="h-8 pl-8 text-sm cosmic-input"
        />
      </div>

      {/* Role Filter */}
      <Popover open={roleOpen} onOpenChange={setRoleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 w-full sm:w-[140px] justify-between gap-2 text-sm",
              selectedRole 
                ? "border-border/60" 
                : "border-border/40 text-muted-foreground"
            )}
          >
            {selectedRole ? (
              <span className="flex items-center gap-2">
                <selectedRole.icon className={cn("h-4 w-4", selectedRole.color)} />
                <span>{selectedRole.label[language]}</span>
              </span>
            ) : (
              <span>{t.dashboard.allRoles}</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 bg-card border-border z-50" align="start">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => { updateFilter('roleFilter', 'all'); setRoleOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                filters.roleFilter === 'all' ? "bg-primary/20" : "hover:bg-primary/10"
              )}
            >
              {filters.roleFilter === 'all' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
              <span>{t.dashboard.allRoles}</span>
            </button>
            {(Object.keys(roleConfig) as Role[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              const isSelected = filters.roleFilter === role;
              
              return (
                <button
                  key={role}
                  onClick={() => { updateFilter('roleFilter', role); setRoleOpen(false); }}
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
              "h-8 w-full sm:w-[180px] justify-between gap-2 text-sm",
              selectedClass 
                ? "border-transparent" 
                : "border-border/40 text-muted-foreground"
            )}
            style={selectedClass ? {
              backgroundColor: `hsl(var(--class-${selectedClass.id}) / 0.2)`,
              color: `hsl(var(--class-${selectedClass.id}))`
            } : undefined}
          >
            <span className="truncate">
              {selectedClass ? selectedClass.name[language] : t.dashboard.allClasses}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1.5 bg-card border-border z-50" align="start">
          <div className="flex flex-col gap-0.5 max-h-[320px] overflow-y-auto">
            <button
              onClick={() => { updateFilter('classFilter', 'all'); setClassOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                filters.classFilter === 'all' ? "bg-primary/20" : "hover:bg-primary/10"
              )}
            >
              {filters.classFilter === 'all' && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
              <span>{t.dashboard.allClasses}</span>
            </button>
            {wowClasses.map((cls) => {
              const isSelected = filters.classFilter === cls.id;
              
              return (
                <button
                  key={cls.id}
                  onClick={() => { updateFilter('classFilter', cls.id); setClassOpen(false); }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                    isSelected ? "bg-primary/20" : "hover:bg-primary/10"
                  )}
                  style={{ color: `hsl(var(--class-${cls.id}))` }}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className="truncate">{cls.name[language]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
