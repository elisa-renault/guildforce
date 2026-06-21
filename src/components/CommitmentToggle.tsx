import { useLanguage } from '@/contexts/LanguageContext';
import { commitmentBadgeClass, commitmentTextClass } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { UserCheck, UserMinus, UserX, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export type CommitmentStatus = 'confirmed' | 'undecided' | 'withdrawn';

interface CommitmentToggleProps {
  status: CommitmentStatus;
  onChange: (value: CommitmentStatus) => void;
  compact?: boolean;
  asBadge?: boolean;
  disabled?: boolean;
}

const statusConfig = {
  confirmed: {
    icon: UserCheck,
    colorClass: commitmentBadgeClass('confirmed'),
    activeClass: 'bg-status-info/20 text-status-info',
  },
  undecided: {
    icon: UserMinus,
    colorClass: commitmentBadgeClass('undecided'),
    activeClass: 'bg-primary/20 text-primary',
  },
  withdrawn: {
    icon: UserX,
    colorClass: commitmentBadgeClass('withdrawn'),
    activeClass: 'bg-muted text-muted-foreground',
  },
};

export const CommitmentToggle = ({
  status,
  onChange,
  compact = false,
  asBadge = false,
  disabled = false,
}: CommitmentToggleProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const handleOpenChange = (value: boolean) => {
    if (disabled) return;
    setOpen(value);
  };

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

  // Badge-style dropdown (looks like read-mode badge but clickable)
  if (asBadge) {
    return (
      <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] md:text-xs cursor-pointer transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              config.colorClass,
              disabled && "opacity-60 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <Icon className="h-3 w-3" strokeWidth={1.5} />
            <span className="hidden md:inline">{labels[status]}</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5 bg-card border-border z-50" align="start">
          <div className="space-y-0.5">
            {(['confirmed', 'undecided', 'withdrawn'] as CommitmentStatus[]).map((s) => {
              const ItemIcon = statusConfig[s].icon;
              const isActive = status === s;
              return (
                <button
                  key={s}
                  onClick={() => { if (!disabled) { onChange(s); setOpen(false); } }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    isActive ? statusConfig[s].activeClass : cn(commitmentTextClass(s), "hover:bg-primary/10")
                  )}
                  disabled={disabled}
                >
                  <ItemIcon className="h-3.5 w-3.5" />
                  <span>{labels[s]}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Compact dropdown version
  if (compact) {
    return (
      <Popover open={disabled ? false : open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 justify-between gap-1.5 text-xs px-2", config.colorClass)}
            disabled={disabled}
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
                  onClick={() => { if (!disabled) { onChange(s); setOpen(false); } }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-sm transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    isActive ? statusConfig[s].activeClass : cn(commitmentTextClass(s), "hover:bg-primary/10")
                  )}
                  disabled={disabled}
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

  // Full version - buttons with descriptions
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground">{t.wishes.commitment.title}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['confirmed', 'undecided', 'withdrawn'] as CommitmentStatus[]).map((s) => {
          const ItemIcon = statusConfig[s].icon;
          const isActive = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => { if (!disabled) onChange(s); }}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-lg border transition-all duration-200 text-left outline-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive 
                  ? statusConfig[s].colorClass
                  : "bg-card/50 border-border/50 hover:border-border"
              )}
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <ItemIcon 
                  className={cn(
                    "h-4 w-4",
                    isActive ? "" : "text-muted-foreground"
                  )} 
                  strokeWidth={1.5} 
                />
                <span className={cn(
                  "font-medium text-sm",
                  isActive ? "" : "text-foreground"
                )}>
                  {labels[s]}
                </span>
              </div>
              <p className={cn(
                "text-xs leading-relaxed",
                isActive ? "opacity-90" : "text-muted-foreground"
              )}>
                {descriptions[s]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
