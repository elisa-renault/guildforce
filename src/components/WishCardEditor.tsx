import React, { useState, forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  wowClasses,
  getClassById,
  getLocalizedClassName,
  getLocalizedSpecName,
  getSpecById,
  Role,
  RangeType,
  Specialization,
} from '@/data/wowClasses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { moveSpecOrder } from '@/lib/wishOrder';
import { Check, ChevronDown, ChevronUp, Shield, Heart, Swords, Crosshair } from 'lucide-react';

interface WishData {
  classId: string;
  specIds: string[];
  comment: string;
}

interface WishCardEditorProps {
  wish: WishData;
  onChange: (field: keyof WishData, value: any) => void;
  usedClassIds?: string[];
}

const roleConfig: Record<Role, { color: string; bgSelected: string }> = {
  tank: { color: 'text-tank', bgSelected: 'bg-tank/20 border-tank/50' },
  healer: { color: 'text-healer', bgSelected: 'bg-healer/20 border-healer/50' },
  dps: { color: 'text-dps', bgSelected: 'bg-dps/20 border-dps/50' },
};

// Get the appropriate icon for a spec based on role and range
const getSpecIcon = (spec: Specialization) => {
  if (spec.role === 'tank') return Shield;
  if (spec.role === 'healer') return Heart;
  // DPS: differentiate melee vs ranged
  return spec.range === 'ranged' ? Crosshair : Swords;
};

export const WishCardEditor = forwardRef<HTMLDivElement, WishCardEditorProps>(
  ({ wish, onChange, usedClassIds = [] }, ref) => {
  const { language, t } = useLanguage();
  const [classOpen, setClassOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);

  const selectedClass = wish.classId ? getClassById(wish.classId) : null;
  const selectedSpecs = wish.specIds
    .map((specId) => selectedClass?.specs.find((spec) => spec.id === specId) || getSpecById(specId))
    .filter(Boolean) as Specialization[];
  
  // Filter out already used classes (except the current one)
  const availableClasses = wowClasses.filter(
    cls => cls.id === wish.classId || !usedClassIds.includes(cls.id)
  );

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
      // Prevent deselecting if it's the last spec
      if (wish.specIds.length <= 1) return;
      onChange('specIds', wish.specIds.filter(id => id !== specId));
    } else {
      onChange('specIds', [...wish.specIds, specId]);
    }
  };

  const handleSpecMove = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= wish.specIds.length) return;
    onChange('specIds', moveSpecOrder(wish.specIds, index, nextIndex));
  };
  
  const hasSpecError = wish.classId && wish.specIds.length === 0;

  const classPlaceholder = t.wishes.selectClass;
  const specPlaceholder = t.wishes.selectSpecs;
  const commentPlaceholder = t.wishes.commentPlaceholder;

  return (
    <div ref={ref} className="flex flex-col lg:flex-row gap-2 lg:gap-3 flex-1">
      {/* Class Selector */}
      <Popover open={classOpen} onOpenChange={setClassOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full lg:w-[250px] justify-between h-9 text-sm font-medium flex-shrink-0",
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
              {selectedClass ? getLocalizedClassName(selectedClass.id, language) : classPlaceholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-1.5 bg-card border-border z-50" align="start">
          <div className="grid grid-cols-2 gap-0.5 max-h-[320px] overflow-y-auto">
            {availableClasses.map((cls) => {
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
                  <span className="truncate">{getLocalizedClassName(cls.id, language)}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Spec Selector */}
      {selectedClass ? (
        <Popover open={specOpen} onOpenChange={setSpecOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full lg:w-[500px] justify-between h-9 text-sm bg-card/50 hover:bg-card/80 flex-shrink-0",
                selectedSpecs.length > 0
                  ? "border-border"
                  : "border-dashed border-muted-foreground/40 text-muted-foreground",
                hasSpecError && "border-destructive/60 animate-pulse"
              )}
            >
              {selectedSpecs.length > 0 ? (
                <span className="flex items-center gap-1.5 truncate">
                  {selectedSpecs.map((spec, idx) => {
                    const config = roleConfig[spec.role];
                    const Icon = getSpecIcon(spec);
                    return (
                      <span key={spec.id} className="flex items-center gap-1">
                        {idx > 0 && <span className="text-muted-foreground/50">•</span>}
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <span className="text-foreground">{getLocalizedSpecName(spec.id, language)}</span>
                        {idx === 0 && (
                          <Badge variant="secondary" className="ml-1 hidden lg:inline-flex px-1.5 py-0 text-[10px]">
                            {t.wishes.mainSpec}
                          </Badge>
                        )}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4 opacity-40" />
                  <Heart className="h-4 w-4 opacity-40" />
                  <Swords className="h-4 w-4 opacity-40" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-1.5 bg-card border-border z-50" align="start">
            {selectedSpecs.length > 0 && (
              <div className="mb-2 pb-2 border-b border-border/60">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground px-1">
                  <span>{t.wishes.reorderSpecs}</span>
                  <span>{t.wishes.mainSpec}</span>
                </div>
                <div className="mt-1 space-y-1">
                  {selectedSpecs.map((spec, idx) => {
                    const config = roleConfig[spec.role];
                    const Icon = getSpecIcon(spec);
                    const canMoveUp = idx > 0;
                    const canMoveDown = idx < selectedSpecs.length - 1;
                    return (
                      <div key={spec.id} className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1">
                        <span className="w-4 text-[10px] text-muted-foreground text-right">{idx + 1}</span>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        <span className="flex-1 text-xs text-foreground truncate">
                          {getLocalizedSpecName(spec.id, language)}
                        </span>
                        {idx === 0 && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[9px]">
                            {t.wishes.mainSpec}
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSpecMove(idx, 'up')}
                            disabled={!canMoveUp}
                            className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={t.wishes.moveSpecUp}
                          >
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSpecMove(idx, 'down')}
                            disabled={!canMoveDown}
                            className="w-5 h-5 rounded bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={t.wishes.moveSpecDown}
                          >
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {selectedClass.specs.map((spec) => {
                const isSelected = wish.specIds.includes(spec.id);
                const config = roleConfig[spec.role];
                const Icon = getSpecIcon(spec);
                
                return (
                  <button
                    key={spec.id}
                    onClick={() => handleSpecToggle(spec.id)}
                    disabled={isSelected && wish.specIds.length <= 1}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors text-left",
                      isSelected 
                        ? "bg-primary/20" 
                        : "hover:bg-primary/10",
                      isSelected && wish.specIds.length <= 1 && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className={cn("flex-1", isSelected ? config.color : "text-foreground")}>
                      {getLocalizedSpecName(spec.id, language)}
                    </span>
                    {isSelected && <Check className={cn("h-4 w-4", config.color)} />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="h-9 w-full lg:w-[500px] flex-shrink-0 rounded-md border border-dashed border-muted-foreground/20 bg-card/30 flex items-center justify-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground/30" />
          <Heart className="h-4 w-4 text-muted-foreground/30" />
          <Swords className="h-4 w-4 text-muted-foreground/30" />
        </div>
      )}

      {/* Comment */}
      <input
        type="text"
        placeholder={commentPlaceholder}
        value={wish.comment}
        onChange={(e) => onChange('comment', e.target.value)}
        className="h-9 w-full lg:flex-1 rounded-md border border-border bg-card/50 px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
    </div>
  );
});

WishCardEditor.displayName = 'WishCardEditor';
