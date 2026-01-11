import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1 sm:max-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <Input
          placeholder={t.common.search}
          value={filters.searchQuery}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="h-8 pl-8 text-sm cosmic-input"
        />
      </div>
      <Select value={filters.roleFilter} onValueChange={(v) => updateFilter('roleFilter', v)}>
        <SelectTrigger className="h-8 w-full sm:w-[120px] text-sm cosmic-input">
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
        <SelectTrigger className="h-8 w-full sm:w-[140px] text-sm cosmic-input">
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
  );
};
