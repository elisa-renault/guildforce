import { useLanguage } from '@/contexts/LanguageContext';
import { getClassById, Specialization } from '@/data/wowClasses';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SpecSelectorProps {
  classId: string;
  selectedSpecs: string[];
  onChange: (specIds: string[]) => void;
}

const roleColors: Record<string, string> = {
  tank: 'bg-tank/20 text-tank border-tank/50 hover:bg-tank/30',
  healer: 'bg-healer/20 text-healer border-healer/50 hover:bg-healer/30',
  dps: 'bg-dps/20 text-dps border-dps/50 hover:bg-dps/30',
};

export const SpecSelector = ({ classId, selectedSpecs, onChange }: SpecSelectorProps) => {
  const { language, t } = useLanguage();
  const wowClass = getClassById(classId);

  if (!wowClass) {
    return (
      <div className="text-sm text-muted-foreground p-2 border border-dashed rounded-md">
        {t.wishes.selectClass}
      </div>
    );
  }

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
        return (
          <Badge
            key={spec.id}
            variant="outline"
            className={cn(
              "cursor-pointer transition-all",
              roleColors[spec.role],
              isSelected && "ring-2 ring-offset-2 ring-offset-background"
            )}
            onClick={() => toggleSpec(spec.id)}
          >
            {spec.name[language]}
            <span className="ml-1 text-xs opacity-70">
              ({spec.role === 'tank' ? 'T' : spec.role === 'healer' ? 'H' : 'D'})
            </span>
          </Badge>
        );
      })}
    </div>
  );
};
