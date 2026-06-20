import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layers, Lock } from 'lucide-react';
import { toneTextClass } from '@/lib/design-tokens';
import { resolveWishLockState } from '@/lib/wishLock';

interface Roster {
  id: string;
  name: string;
  is_default: boolean;
  hasAccess: boolean;
  wishes_locked?: boolean | null;
  wishes_lock_at?: string | null;
}

interface RosterSelectorProps {
  rosters: Roster[];
  selectedRosterId: string | null;
  onSelect: (rosterId: string) => void;
  showAccessIndicator?: boolean;
  showWishesLockIndicator?: boolean;
}

export const RosterSelector = ({
  rosters,
  selectedRosterId,
  onSelect,
  showAccessIndicator = false,
  showWishesLockIndicator = false,
}: RosterSelectorProps) => {
  const { t } = useLanguage();
  
  const selectedRoster = rosters.find(r => r.id === selectedRosterId);
  const selectedLockState = selectedRoster
    ? resolveWishLockState({
        rosterLocked: selectedRoster.wishes_locked,
        rosterLockAt: selectedRoster.wishes_lock_at,
        memberLocked: false,
      })
    : null;

  // If only one roster, display it as static text (no dropdown)
  if (rosters.length <= 1) {
    if (!selectedRoster) return null;
    
    return (
      <div className="flex max-w-[34vw] items-center gap-1.5 md:max-w-none md:gap-2 min-w-0">
        <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm md:text-base font-medium truncate">{selectedRoster.name}</span>
        {selectedRoster.is_default && (
          <span className="text-xs text-muted-foreground flex-shrink-0">({t.rosters.default})</span>
        )}
        {showWishesLockIndicator && selectedLockState?.isLocked && (
          <Lock className={`h-3.5 w-3.5 flex-shrink-0 ${toneTextClass('warning')}`} />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
      <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
      <Select value={selectedRosterId || ''} onValueChange={onSelect}>
        <SelectTrigger
          aria-label={t.rosters.selectRoster}
          className="h-7 w-[128px] max-w-[34vw] border-border bg-card text-xs md:h-8 md:w-[300px] md:max-w-[45vw] md:text-sm"
        >
          <SelectValue className="truncate" placeholder={t.rosters.selectRoster} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          {rosters.map((roster) => {
            const lockState = resolveWishLockState({
              rosterLocked: roster.wishes_locked,
              rosterLockAt: roster.wishes_lock_at,
              memberLocked: false,
            });
            return (
              <SelectItem 
                key={roster.id} 
                value={roster.id}
                className="hover:bg-primary/20"
                disabled={showAccessIndicator && !roster.hasAccess}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{roster.name}</span>
                  {roster.is_default && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">({t.rosters.default})</span>
                  )}
                  {showAccessIndicator && !roster.hasAccess && (
                    <Lock className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  )}
                  {showWishesLockIndicator && lockState.isLocked && (
                    <Lock className={`h-3.5 w-3.5 flex-shrink-0 ${toneTextClass('warning')}`} />
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {showWishesLockIndicator && selectedLockState?.isLocked && (
        <Lock className={`h-3.5 w-3.5 flex-shrink-0 ${toneTextClass('warning')}`} />
      )}
    </div>
  );
};
