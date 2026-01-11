import { useLanguage } from '@/contexts/LanguageContext';
import { wowClasses, getClassById, getSpecById, Role } from '@/data/wowClasses';
import { WishData } from '@/types/guild';
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
    <div className="flex flex-col gap-1.5">
      {/* Class Selector */}
      <Popover open={classOpen} onOpenChange={setClassOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 w-full justify-between gap-1 text-xs font-medium",
              selectedClass 
                ? "border-transparent" 
                : "border-dashed border-muted-foreground/40 text-muted-foreground bg-transparent hover:bg-muted/20"
            )}
            style={selectedClass ? {
              backgroundColor: `hsl(var(--class-${selectedClass.id}) / 0.2)`,
              color: `hsl(var(--class-${selectedClass.id}))`
            } : undefined}
          >
            <span className="truncate">
              {selectedClass ? selectedClass.name[language] : t.wishes.selectClass}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 bg-card border-border z-50" align="start">
          <div className="flex flex-col gap-0.5 max-h-[280px] overflow-y-auto">
            {wowClasses.map((cls) => {
              const isSelected = wish.classId === cls.id;
              return (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                    isSelected 
                      ? "bg-primary/20" 
                      : "hover:bg-primary/10"
                  )}
                  style={{ color: `hsl(var(--class-${cls.id}))` }}
                >
                  {isSelected && <Check className="h-3 w-3 flex-shrink-0" />}
                  <span className="truncate">{cls.name[language]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Specs & Comment Row */}
      <div className="flex items-center gap-1">
        {/* Spec Selector */}
        {selectedClass ? (
          <Popover open={specOpen} onOpenChange={setSpecOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-6 flex-1 justify-between gap-1 text-[10px] bg-background/50 hover:bg-muted/50",
                  selectedSpecs.length > 0
                    ? "border-border/60"
                    : "border-dashed border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {selectedSpecs.length > 0 ? (
                  <span className="flex items-center gap-1 truncate">
                    {(() => {
                      const firstSpec = selectedSpecs[0]!;
                      const config = roleConfig[firstSpec.role];
                      const Icon = config.icon;
                      return (
                        <>
                          <Icon className={cn("h-3 w-3 flex-shrink-0", config.color)} />
                          <span className="truncate">{firstSpec.name[language]}</span>
                        </>
                      );
                    })()}
                    {selectedSpecs.length > 1 && (
                      <span className="text-muted-foreground flex-shrink-0">+{selectedSpecs.length - 1}</span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {selectedClass.specs.slice(0, 3).map(spec => {
                      const config = roleConfig[spec.role];
                      const Icon = config.icon;
                      return <Icon key={spec.id} className="h-3 w-3 opacity-40" />;
                    })}
                  </span>
                )}
                <ChevronDown className="h-2.5 w-2.5 opacity-50 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5 bg-card border-border z-50" align="start">
              <div className="space-y-0.5">
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
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      <span className="flex-1 truncate">{spec.name[language]}</span>
                      {isSelected && <Check className="h-3 w-3 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex-1" />
        )}

        {/* Comment Button */}
        <Popover open={commentOpen} onOpenChange={setCommentOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0",
                wish.comment ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
              title={t.wishes.comment}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-card border-border z-50" align="end">
            <Textarea
              placeholder={t.wishes.commentPlaceholder}
              value={wish.comment}
              onChange={(e) => onChange('comment', e.target.value)}
              className="min-h-[60px] resize-none text-xs"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
