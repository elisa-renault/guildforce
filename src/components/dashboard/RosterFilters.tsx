import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlowCard } from '@/components/GlowCard';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses } from '@/data/wowClasses';
import { RosterFilters as RosterFiltersType } from '@/types/guild';

interface RosterFiltersProps {
  filters: RosterFiltersType;
  onFiltersChange: (filters: RosterFiltersType) => void;
}

export const RosterFilters = ({ filters, onFiltersChange }: RosterFiltersProps) => {
  const { t, language } = useLanguage();

  const updateFilter = <K extends keyof RosterFiltersType>(key: K, value: RosterFiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <GlowCard className="p-6 mb-6 animate-fade-in" style={{ animationDelay: '250ms' }} hoverable={false}>
      <h3 className="text-lg font-semibold text-foreground mb-4">{t.dashboard.filters}</h3>
      <div className="flex flex-wrap gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            placeholder={t.common.search}
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="cosmic-input pl-10 w-56"
          />
        </div>
        <Select value={filters.roleFilter} onValueChange={(v) => updateFilter('roleFilter', v)}>
          <SelectTrigger className="w-40 cosmic-input">
            <SelectValue placeholder={t.dashboard.allRoles} />
          </SelectTrigger>
          <SelectContent className="cosmic-glass border-border/50">
            <SelectItem value="all">{t.dashboard.allRoles}</SelectItem>
            <SelectItem value="tank">{t.dashboard.tank}</SelectItem>
            <SelectItem value="healer">{t.dashboard.healer}</SelectItem>
            <SelectItem value="dps">{t.dashboard.dps}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.classFilter} onValueChange={(v) => updateFilter('classFilter', v)}>
          <SelectTrigger className="w-48 cosmic-input">
            <SelectValue placeholder={t.dashboard.allClasses} />
          </SelectTrigger>
          <SelectContent className="cosmic-glass border-border/50">
            <SelectItem value="all">{t.dashboard.allClasses}</SelectItem>
            {wowClasses.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name[language]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </GlowCard>
  );
};
