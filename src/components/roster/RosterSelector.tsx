import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layers } from 'lucide-react';

interface Roster {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
}

interface RosterSelectorProps {
  rosters: Roster[];
  selectedRosterId: string | null;
  onSelect: (rosterId: string) => void;
  showAccessIndicator?: boolean;
}

export const RosterSelector = ({ rosters, selectedRosterId, onSelect, showAccessIndicator = false }: RosterSelectorProps) => {
  const { t } = useLanguage();
  
  if (rosters.length <= 1) {
    return null;
  }

  const selectedRoster = rosters.find(r => r.id === selectedRosterId);

  return (
    <div className="flex items-center gap-2">
      <Layers className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedRosterId || ''} onValueChange={onSelect}>
        <SelectTrigger className="w-[180px] h-8 bg-card border-border">
          <SelectValue placeholder={t.rosters?.selectRoster || 'Select roster'} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {rosters.map((roster) => (
            <SelectItem 
              key={roster.id} 
              value={roster.id}
              className="hover:bg-primary/20"
              disabled={showAccessIndicator && !roster.hasAccess}
            >
              <span className="flex items-center gap-2">
                {roster.name}
                {roster.is_default && (
                  <span className="text-xs text-muted-foreground">({t.rosters?.default || 'Default'})</span>
                )}
                {showAccessIndicator && !roster.hasAccess && (
                  <span className="text-xs text-destructive">🔒</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
