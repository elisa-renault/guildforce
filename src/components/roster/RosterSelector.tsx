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
  
  const selectedRoster = rosters.find(r => r.id === selectedRosterId);

  // If only one roster, display it as static text (no dropdown)
  if (rosters.length <= 1) {
    if (!selectedRoster) return null;
    
    return (
      <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
        <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm md:text-base font-medium truncate">{selectedRoster.name}</span>
        {selectedRoster.is_default && (
          <span className="text-xs text-muted-foreground flex-shrink-0">({t.rosters?.default || 'Default'})</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
      <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
      <Select value={selectedRosterId || ''} onValueChange={onSelect}>
        <SelectTrigger className="h-7 md:h-8 w-[140px] md:w-[300px] max-w-[35vw] md:max-w-[45vw] bg-card border-border text-xs md:text-sm">
          <SelectValue className="truncate" placeholder={t.rosters?.selectRoster || 'Select roster'} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          {rosters.map((roster) => (
            <SelectItem 
              key={roster.id} 
              value={roster.id}
              className="hover:bg-primary/20"
              disabled={showAccessIndicator && !roster.hasAccess}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">{roster.name}</span>
                {roster.is_default && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">({t.rosters?.default || 'Default'})</span>
                )}
                {showAccessIndicator && !roster.hasAccess && (
                  <span className="text-xs text-destructive flex-shrink-0">🔒</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
