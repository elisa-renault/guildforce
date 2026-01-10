import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, Role } from '@/data/wowClasses';
import { cn } from '@/lib/utils';
import { Check, Shield, Heart, Swords } from 'lucide-react';

interface SpecButtonsProps {
  classId: string;
  selectedSpecs: string[];
  onChange: (specIds: string[]) => void;
}

const roleConfig: Record<Role, { icon: typeof Shield; color: string; bgSelected: string; label: string }> = {
  tank: { 
    icon: Shield, 
    color: 'text-tank', 
    bgSelected: 'bg-tank/30 border-tank',
    label: 'Tank'
  },
  healer: { 
    icon: Heart, 
    color: 'text-healer', 
    bgSelected: 'bg-healer/30 border-healer',
    label: 'Heal'
  },
  dps: { 
    icon: Swords, 
    color: 'text-dps', 
    bgSelected: 'bg-dps/30 border-dps',
    label: 'DPS'
  },
};

export const SpecButtons = ({ classId, selectedSpecs, onChange }: SpecButtonsProps) => {
  const { language } = useLanguage();
  const wowClass = getClassById(classId);

  if (!wowClass) return null;

  const toggleSpec = (specId: string) => {
    if (selectedSpecs.includes(specId)) {
      onChange(selectedSpecs.filter(id => id !== specId));
    } else {
      onChange([...selectedSpecs, specId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {wowClass.specs.map((spec) => {
        const isSelected = selectedSpecs.includes(spec.id);
        const config = roleConfig[spec.role];
        const Icon = config.icon;

        return (
          <button
            key={spec.id}
            type="button"
            onClick={() => toggleSpec(spec.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200",
              "hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected 
                ? `${config.bgSelected} shadow-md` 
                : "bg-card/50 border-border/50 hover:border-border"
            )}
          >
            {isSelected && (
              <div className={cn(
                "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center",
                config.bgSelected, "border-2"
              )}>
                <Check className={cn("h-3 w-3", config.color)} strokeWidth={3} />
              </div>
            )}
            <Icon className={cn("h-4 w-4", isSelected ? config.color : "text-muted-foreground")} strokeWidth={1.5} />
            <span className={cn(
              "text-sm font-medium",
              isSelected ? config.color : "text-foreground"
            )}>
              {spec.name[language]}
            </span>
          </button>
        );
      })}
    </div>
  );
};
