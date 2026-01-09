import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, WoWClass } from '@/data/wowClasses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ClassSelectorProps {
  value: string;
  onChange: (classId: string) => void;
  placeholder?: string;
}

const classColorMap: Record<string, string> = {
  'warrior': 'bg-class-warrior/20 text-class-warrior border-class-warrior/50',
  'paladin': 'bg-class-paladin/20 text-class-paladin border-class-paladin/50',
  'hunter': 'bg-class-hunter/20 text-class-hunter border-class-hunter/50',
  'rogue': 'bg-class-rogue/20 text-class-rogue border-class-rogue/50',
  'priest': 'bg-class-priest/20 text-class-priest border-class-priest/50',
  'death-knight': 'bg-class-death-knight/20 text-class-death-knight border-class-death-knight/50',
  'shaman': 'bg-class-shaman/20 text-class-shaman border-class-shaman/50',
  'mage': 'bg-class-mage/20 text-class-mage border-class-mage/50',
  'warlock': 'bg-class-warlock/20 text-class-warlock border-class-warlock/50',
  'monk': 'bg-class-monk/20 text-class-monk border-class-monk/50',
  'druid': 'bg-class-druid/20 text-class-druid border-class-druid/50',
  'demon-hunter': 'bg-class-demon-hunter/20 text-class-demon-hunter border-class-demon-hunter/50',
  'evoker': 'bg-class-evoker/20 text-class-evoker border-class-evoker/50',
};

export const ClassSelector = ({ value, onChange, placeholder }: ClassSelectorProps) => {
  const { language, t } = useLanguage();
  const selectedClass = wowClasses.find(c => c.id === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "w-full",
        value && classColorMap[value]
      )}>
        <SelectValue placeholder={placeholder || t.wishes.selectClass}>
          {selectedClass && selectedClass.name[language]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover">
        {wowClasses.map((wowClass) => (
          <SelectItem 
            key={wowClass.id} 
            value={wowClass.id}
            className={cn("cursor-pointer", classColorMap[wowClass.id])}
          >
            {wowClass.name[language]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
