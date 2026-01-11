import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, Role } from '@/data/wowClasses';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Shield, Heart, Swords } from 'lucide-react';

interface WishData {
  classId: string;
  specIds: string[];
  comment: string;
}

interface WishCardEditorProps {
  wish: WishData;
  onChange: (field: keyof WishData, value: any) => void;
}

const roleConfig: Record<Role, { icon: typeof Shield; color: string; bgSelected: string }> = {
  tank: { icon: Shield, color: 'text-tank', bgSelected: 'bg-tank/20 border-tank/50' },
  healer: { icon: Heart, color: 'text-healer', bgSelected: 'bg-healer/20 border-healer/50' },
  dps: { icon: Swords, color: 'text-dps', bgSelected: 'bg-dps/20 border-dps/50' },
};

export const WishCardEditor = ({ wish, onChange }: WishCardEditorProps) => {
  const { language, t } = useLanguage();
  const [classOpen, setClassOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);

  const selectedClass = wish.classId ? getClassById(wish.classId) : null;
  const selectedSpecs = selectedClass 
    ? selectedClass.specs.filter(s => wish.specIds.includes(s.id))
    : [];

  const handleClassSelect = (classId: string) => {
    if (wish.classId === classId) {
      onChange('classId', '');
    } else {
      onChange('classId', classId);
    }
    setClassOpen(false);
  };

  const handleSpecToggle = (specId: string) => {
    if (wish.specIds.includes(specId)) {
      onChange('specIds', wish.specIds.filter(id => id !== specId));
    } else {
      onChange('specIds', [...wish.specIds, specId]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Class Selector */}
      <div>
        <Label className="text-foreground mb-3 block">{t.wishes.selectClass}</Label>
        <Popover open={classOpen} onOpenChange={setClassOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-between h-12 text-sm font-medium",
                selectedClass 
                  ? "border-transparent" 
                  : "border-dashed border-muted-foreground/40 text-muted-foreground bg-card/50 hover:bg-card/80"
              )}
              style={selectedClass ? {
                backgroundColor: `hsl(var(--class-${selectedClass.id}) / 0.15)`,
                color: `hsl(var(--class-${selectedClass.id}))`,
                borderColor: `hsl(var(--class-${selectedClass.id}) / 0.4)`
              } : undefined}
            >
              <span className="truncate">
                {selectedClass ? selectedClass.name[language] : t.wishes.selectClass}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[380px] p-1.5 bg-card border-border z-50" align="start">
            <div className="grid grid-cols-2 gap-0.5 max-h-[320px] overflow-y-auto">
              {wowClasses.map((cls) => {
                const isSelected = wish.classId === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => handleClassSelect(cls.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors text-left",
                      isSelected 
                        ? "bg-primary/20" 
                        : "hover:bg-primary/10"
                    )}
                    style={{ color: `hsl(var(--class-${cls.id}))` }}
                  >
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                    <span className="truncate">{cls.name[language]}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Spec Selector */}
      <div>
        <Label className="text-foreground mb-3 block">{t.wishes.selectSpecs}</Label>
        {selectedClass ? (
          <Popover open={specOpen} onOpenChange={setSpecOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-between h-12 text-sm bg-card/50 hover:bg-card/80",
                  selectedSpecs.length > 0
                    ? "border-border"
                    : "border-dashed border-muted-foreground/40 text-muted-foreground"
                )}
              >
                {selectedSpecs.length > 0 ? (
                  <span className="flex items-center gap-1.5 truncate">
                    {selectedSpecs.map((spec, idx) => {
                      const config = roleConfig[spec.role];
                      const Icon = config.icon;
                      return (
                        <span key={spec.id} className="flex items-center gap-1">
                          {idx > 0 && <span className="text-muted-foreground/50">•</span>}
                          <Icon className={cn("h-4 w-4", config.color)} />
                          <span className="text-foreground">{spec.name[language]}</span>
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4 opacity-40" />
                    <Heart className="h-4 w-4 opacity-40" />
                    <Swords className="h-4 w-4 opacity-40" />
                    <span className="ml-1">{t.wishes.selectSpecs}</span>
                  </span>
                )}
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-1.5 bg-card border-border z-50" align="start">
              <div className="flex flex-col gap-0.5">
                {selectedClass.specs.map((spec) => {
                  const isSelected = wish.specIds.includes(spec.id);
                  const config = roleConfig[spec.role];
                  const Icon = config.icon;
                  
                  return (
                    <button
                      key={spec.id}
                      onClick={() => handleSpecToggle(spec.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors text-left",
                        isSelected 
                          ? "bg-primary/20" 
                          : "hover:bg-primary/10"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color)} />
                      <span className={cn("flex-1", isSelected ? config.color : "text-foreground")}>
                        {spec.name[language]}
                      </span>
                      {isSelected && <Check className={cn("h-4 w-4", config.color)} />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="h-12 w-full rounded-md border border-dashed border-muted-foreground/20 bg-card/30 flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground/30" />
            <Heart className="h-4 w-4 text-muted-foreground/30" />
            <Swords className="h-4 w-4 text-muted-foreground/30" />
            <span className="text-sm text-muted-foreground/50 ml-1">
              {language === 'fr' ? 'Sélectionnez d\'abord une classe' : 'Select a class first'}
            </span>
          </div>
        )}
      </div>

      {/* Comment */}
      <div>
        <Label className="text-foreground mb-2 block">{t.wishes.comment}</Label>
        <Textarea
          placeholder={t.wishes.commentPlaceholder}
          value={wish.comment}
          onChange={(e) => onChange('comment', e.target.value)}
          className="cosmic-input min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
};
