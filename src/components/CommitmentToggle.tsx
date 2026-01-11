import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CheckCircle2, HelpCircle, XCircle, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export type CommitmentStatus = 'confirmed' | 'undecided' | 'withdrawn';

interface CommitmentToggleProps {
  status: CommitmentStatus;
  onChange: (value: CommitmentStatus) => void;
  compact?: boolean;
}

const statusConfig = {
  confirmed: {
    icon: CheckCircle2,
    colorClass: 'bg-healer/20 border-healer/50 text-healer',
    activeClass: 'bg-healer/20 text-healer',
  },
  undecided: {
    icon: HelpCircle,
    colorClass: 'bg-amber-500/20 border-amber-500/50 text-amber-500',
    activeClass: 'bg-amber-500/20 text-amber-500',
  },
  withdrawn: {
    icon: XCircle,
    colorClass: 'bg-destructive/20 border-destructive/50 text-destructive',
    activeClass: 'bg-destructive/20 text-destructive',
  },
};

export const CommitmentToggle = ({ status, onChange, compact = false }: CommitmentToggleProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const config = statusConfig[status];
  const Icon = config.icon;

  const labels: Record<CommitmentStatus, string> = {
    confirmed: t.wishes.commitment.confirmed,
    undecided: t.wishes.commitment.undecided,
    withdrawn: t.wishes.commitment.withdrawn,
  };

  const descriptions: Record<CommitmentStatus, string> = {
    confirmed: t.wishes.commitment.confirmedDesc,
    undecided: t.wishes.commitment.undecidedDesc,
    withdrawn: t.wishes.commitment.withdrawnDesc,
  };

  // Compact dropdown version
  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 justify-between gap-1.5 text-xs px-2", config.colorClass)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{labels[status]}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1.5 bg-card border-border z-50" align="start">
          <div className="space-y-0.5">
            {(['confirmed', 'undecided', 'withdrawn'] as CommitmentStatus[]).map((s) => {
              const ItemIcon = statusConfig[s].icon;
              const isActive = status === s;
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-sm transition-colors text-left",
                    isActive ? statusConfig[s].activeClass : "hover:bg-primary/10"
                  )}
                >
                  <ItemIcon className="h-4 w-4" />
                  <span>{labels[s]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full version
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{t.wishes.commitment.title}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['confirmed', 'undecided', 'withdrawn'] as CommitmentStatus[]).map((s) => {
          const ItemIcon = statusConfig[s].icon;
          const isActive = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200 text-left",
                "hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive 
                  ? statusConfig[s].colorClass + " shadow-md"
                  : "bg-card/50 border-border/50 hover:border-border"
              )}
            >
              <ItemIcon 
                className={cn(
                  "h-5 w-5 mt-0.5 flex-shrink-0",
                  isActive ? "" : "text-muted-foreground"
                )} 
                strokeWidth={1.5} 
              />
              <div>
                <p className={cn(
                  "font-medium text-sm",
                  isActive ? "" : "text-foreground"
                )}>
                  {labels[s]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {descriptions[s]}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
