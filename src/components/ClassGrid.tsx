import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedClassName, wowClasses, WoWClass } from '@/data/wowClasses';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ClassGridProps {
  value: string;
  onChange: (classId: string) => void;
}

const classColorMap: Record<string, { bg: string; border: string; text: string }> = {
  'warrior': { bg: 'bg-class-warrior/20', border: 'border-class-warrior', text: 'text-class-warrior' },
  'paladin': { bg: 'bg-class-paladin/20', border: 'border-class-paladin', text: 'text-class-paladin' },
  'hunter': { bg: 'bg-class-hunter/20', border: 'border-class-hunter', text: 'text-class-hunter' },
  'rogue': { bg: 'bg-class-rogue/20', border: 'border-class-rogue', text: 'text-class-rogue' },
  'priest': { bg: 'bg-class-priest/20', border: 'border-class-priest', text: 'text-class-priest' },
  'death-knight': { bg: 'bg-class-death-knight/20', border: 'border-class-death-knight', text: 'text-class-death-knight' },
  'shaman': { bg: 'bg-class-shaman/20', border: 'border-class-shaman', text: 'text-class-shaman' },
  'mage': { bg: 'bg-class-mage/20', border: 'border-class-mage', text: 'text-class-mage' },
  'warlock': { bg: 'bg-class-warlock/20', border: 'border-class-warlock', text: 'text-class-warlock' },
  'monk': { bg: 'bg-class-monk/20', border: 'border-class-monk', text: 'text-class-monk' },
  'druid': { bg: 'bg-class-druid/20', border: 'border-class-druid', text: 'text-class-druid' },
  'demon-hunter': { bg: 'bg-class-demon-hunter/20', border: 'border-class-demon-hunter', text: 'text-class-demon-hunter' },
  'evoker': { bg: 'bg-class-evoker/20', border: 'border-class-evoker', text: 'text-class-evoker' },
};

export const ClassGrid = ({ value, onChange }: ClassGridProps) => {
  const { language } = useLanguage();

  const handleClick = (classId: string) => {
    // Toggle: if already selected, deselect
    if (value === classId) {
      onChange('');
    } else {
      onChange(classId);
    }
  };

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
      {wowClasses.map((wowClass) => {
        const isSelected = value === wowClass.id;
        const colors = classColorMap[wowClass.id];
        
        return (
          <button
            key={wowClass.id}
            type="button"
            onClick={() => handleClick(wowClass.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200",
              "hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected 
                ? `${colors.bg} ${colors.border} shadow-lg scale-105` 
                : "bg-card/50 border-border/50 hover:border-border"
            )}
          >
            {isSelected && (
              <div className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                colors.bg, colors.border, "border-2"
              )}>
                <Check className={cn("h-3 w-3", colors.text)} strokeWidth={3} />
              </div>
            )}
            <span className={cn(
              "text-[10px] sm:text-xs font-medium text-center leading-tight",
              isSelected ? colors.text : "text-muted-foreground"
            )}>
              {getLocalizedClassName(wowClass.id, language)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
