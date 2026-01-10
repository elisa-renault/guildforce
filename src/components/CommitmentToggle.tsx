import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CheckCircle2, HelpCircle } from 'lucide-react';

interface CommitmentToggleProps {
  confirmed: boolean;
  onChange: (value: boolean) => void;
}

export const CommitmentToggle = ({ confirmed, onChange }: CommitmentToggleProps) => {
  const { t } = useLanguage();

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
