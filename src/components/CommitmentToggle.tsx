import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CheckCircle2, HelpCircle, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface CommitmentToggleProps {
  confirmed: boolean;
  onChange: (value: boolean) => void;
  compact?: boolean;
}

export const CommitmentToggle = ({ confirmed, onChange, compact = false }: CommitmentToggleProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  // Compact dropdown version
  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-between gap-2 text-xs",
              confirmed 
                ? "bg-healer/20 border-healer/50 text-healer" 
                : "border-muted-foreground/30 text-muted-foreground"
            )}
          >
            {confirmed ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.wishes.commitment.confirmed}</span>
                <span className="sm:hidden">{t.wishes.status}</span>
              </>
            ) : (
              <>
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.wishes.commitment.potential}</span>
                <span className="sm:hidden">{t.wishes.status}</span>
              </>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 bg-card border-border z-50" align="start">
          <div className="space-y-1">
            <button
              onClick={() => { onChange(true); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors text-left",
                confirmed ? "bg-healer/20 text-healer" : "hover:bg-primary/10"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{t.wishes.commitment.confirmed}</span>
            </button>
            <button
              onClick={() => { onChange(false); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors text-left",
                !confirmed ? "bg-muted/30" : "hover:bg-primary/10"
              )}
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t.wishes.commitment.potential}</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full version (original)
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{t.wishes.commitment.title}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200 text-left",
            "hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            confirmed 
              ? "bg-healer/20 border-healer shadow-md" 
              : "bg-card/50 border-border/50 hover:border-border"
          )}
        >
          <CheckCircle2 
            className={cn(
              "h-5 w-5 mt-0.5 flex-shrink-0",
              confirmed ? "text-healer" : "text-muted-foreground"
            )} 
            strokeWidth={1.5} 
          />
          <div>
            <p className={cn(
              "font-medium text-sm",
              confirmed ? "text-healer" : "text-foreground"
            )}>
              {t.wishes.commitment.confirmed}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.wishes.commitment.confirmedDesc}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200 text-left",
            "hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            !confirmed 
              ? "bg-muted/50 border-muted-foreground/50 shadow-md" 
              : "bg-card/50 border-border/50 hover:border-border"
          )}
        >
          <HelpCircle 
            className={cn(
              "h-5 w-5 mt-0.5 flex-shrink-0",
              !confirmed ? "text-muted-foreground" : "text-muted-foreground/50"
            )} 
            strokeWidth={1.5} 
          />
          <div>
            <p className={cn(
              "font-medium text-sm",
              !confirmed ? "text-foreground" : "text-muted-foreground"
            )}>
              {t.wishes.commitment.potential}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.wishes.commitment.potentialDesc}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
