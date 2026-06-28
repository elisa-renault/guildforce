import { Armchair, Check, CheckCircle2, ChevronDown, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RosterSelectionStatus } from '@/types/guild';
import { cn } from '@/lib/utils';

interface RosterDecisionToggleProps {
  value: RosterSelectionStatus | null | undefined;
  onChange: (value: RosterSelectionStatus) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

const decisionConfig = {
  undecided: {
    icon: Clock,
    pillClass: 'border-border/60 bg-muted/45 text-muted-foreground',
    activeClass: 'bg-muted text-muted-foreground',
    itemClass: 'text-muted-foreground hover:bg-muted/70',
  },
  selected: {
    icon: CheckCircle2,
    pillClass: 'border-healer/35 bg-healer/15 text-healer',
    activeClass: 'bg-healer/20 text-healer',
    itemClass: 'text-healer hover:bg-healer/10',
  },
  bench: {
    icon: Armchair,
    pillClass: 'border-warning/35 bg-warning/15 text-warning',
    activeClass: 'bg-warning/20 text-warning',
    itemClass: 'text-warning hover:bg-warning/10',
  },
  not_selected: {
    icon: XCircle,
    pillClass: 'border-destructive/35 bg-destructive/15 text-destructive',
    activeClass: 'bg-destructive/20 text-destructive',
    itemClass: 'text-destructive hover:bg-destructive/10',
  },
} satisfies Record<RosterSelectionStatus, {
  icon: typeof Clock;
  pillClass: string;
  activeClass: string;
  itemClass: string;
}>;

const decisionOrder: RosterSelectionStatus[] = ['undecided', 'selected', 'bench', 'not_selected'];

export const RosterDecisionToggle = ({
  value,
  onChange,
  disabled = false,
  compact = false,
  className,
}: RosterDecisionToggleProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const effectiveValue: RosterSelectionStatus = value && decisionConfig[value] ? value : 'undecided';
  const config = decisionConfig[effectiveValue];
  const Icon = config.icon;

  const labels: Record<RosterSelectionStatus, string> = {
    undecided: t.wishes.rosterDecision.undecided,
    selected: t.wishes.rosterDecision.selected,
    bench: t.wishes.rosterDecision.bench,
    not_selected: t.wishes.rosterDecision.notSelected,
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-6 items-center justify-between gap-1.5 rounded-full border px-2.5 text-[10px] font-medium transition-colors hover:opacity-85 md:text-xs',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            config.pillClass,
            compact ? 'max-w-full' : 'min-w-[118px]',
            disabled && 'cursor-not-allowed opacity-60',
            className,
          )}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
            <span className="truncate">{labels[effectiveValue]}</span>
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1.5"
        align="start"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-0.5">
          {decisionOrder.map((decision) => {
            const ItemIcon = decisionConfig[decision].icon;
            const isActive = effectiveValue === decision;
            return (
              <button
                key={decision}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onChange(decision);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                  isActive ? decisionConfig[decision].activeClass : decisionConfig[decision].itemClass,
                )}
              >
                <ItemIcon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                <span className="min-w-0 flex-1 truncate">{labels[decision]}</span>
                {isActive && <Check className="h-4 w-4 shrink-0" strokeWidth={1.8} />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
