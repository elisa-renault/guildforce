import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, getSpecById, Role } from '@/data/wowClasses';
import { WishData } from '@/types/guild';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Shield, Heart, Swords, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface InlineWishEditorProps {
  wish: WishData;
  choiceIndex: number;
  onChange: (field: keyof WishData, value: any) => void;
}

const roleConfig: Record<Role, { icon: typeof Shield; color: string }> = {
  tank: { icon: Shield, color: 'text-tank' },
  healer: { icon: Heart, color: 'text-healer' },
  dps: { icon: Swords, color: 'text-dps' },
};

export const InlineWishEditor = ({ wish, choiceIndex, onChange }: InlineWishEditorProps) => {
  const { language, t } = useLanguage();
  const [classOpen, setClassOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  const selectedClass = wish.classId ? getClassById(wish.classId) : null;
  const selectedSpecs = wish.specIds.map(id => getSpecById(id)).filter(Boolean);

  const handleClassSelect = (classId: string) => {
    if (wish.classId === classId) {
      onChange('classId', '');
      onChange('specIds', []);
    } else {
      onChange('classId', classId);
      onChange('specIds', []);
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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Class Dropdown */}
      <Popover open={classOpen} onOpenChange={setClassOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 min-w-[120px] justify-between gap-2 text-xs",
              selectedClass 
                ? "border-border/50" 
                : "border-dashed border-muted-foreground/30 text-muted-foreground"
            )}
            style={selectedClass ? {
              backgroundColor: `hsl(var(--class-${selectedClass.id}) / 0.15)`,
              borderColor: `hsl(var(--class-${selectedClass.id}) / 0.4)`,
              color: `hsl(var(--class-${selectedClass.id}))`
            } : undefined}
          >
            {selectedClass ? selectedClass.name[language] : t.wishes.selectClass}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 bg-card border-border z-50" align="start">
          <div className="grid grid-cols-2 gap-1 max-h-[300px] overflow-y-auto">
            {wowClasses.map((cls) => {
              const isSelected = wish.classId === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                    isSelected 
                      ? "bg-primary/20" 
                      : "hover:bg-primary/10"
                  )}
                  style={{ color: `hsl(var(--class-${cls.id}))` }}
                >
                  {isSelected && <Check className="h-3 w-3 absolute right-1" />}
                  <span className="truncate pr-4">{cls.name[language]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Spec Dropdown - only shown if class is selected */}
      {selectedClass && (
        <Popover open={specOpen} onOpenChange={setSpecOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 min-w-[100px] justify-between gap-2 text-xs",
                selectedSpecs.length > 0
                  ? "border-border/50"
                  : "border-dashed border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {selectedSpecs.length > 0 ? (
                <span className="flex items-center gap-1">
                  {selectedSpecs.slice(0, 2).map(spec => {
                    const config = roleConfig[spec!.role];
                    const Icon = config.icon;
                    return <Icon key={spec!.id} className={cn("h-3.5 w-3.5", config.color)} />;
                  })}
                  {selectedSpecs.length > 2 && <span>+{selectedSpecs.length - 2}</span>}
                </span>
              ) : (
                t.wishes.selectSpecs
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 bg-card border-border z-50" align="start">
            <div className="space-y-1">
              {selectedClass.specs.map((spec) => {
                const isSelected = wish.specIds.includes(spec.id);
                const config = roleConfig[spec.role];
                const Icon = config.icon;
                
                return (
                  <button
                    key={spec.id}
                    onClick={() => handleSpecToggle(spec.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                      isSelected 
                        ? "bg-primary/20" 
                        : "hover:bg-primary/10"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className="flex-1">{spec.name[language]}</span>
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Comment Button */}
      <Popover open={commentOpen} onOpenChange={setCommentOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              wish.comment ? "text-primary" : "text-muted-foreground"
            )}
            title={t.wishes.comment}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-card border-border z-50" align="start">
          <Textarea
            placeholder={t.wishes.commentPlaceholder}
            value={wish.comment}
            onChange={(e) => onChange('comment', e.target.value)}
            className="min-h-[80px] resize-none text-sm"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
