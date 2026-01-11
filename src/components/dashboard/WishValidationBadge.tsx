import { useState } from 'react';
import { Check, X, RotateCcw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { ValidationStatus } from '@/types/guild';
import { cn } from '@/lib/utils';

interface WishValidationBadgeProps {
  status: ValidationStatus;
  validatedBy?: string | null;
  validatedAt?: string | null;
  isGM?: boolean;
  onValidate?: (status: ValidationStatus) => void;
  loading?: boolean;
  compact?: boolean;
}

export const WishValidationBadge = ({
  status,
  validatedBy,
  validatedAt,
  isGM = false,
  onValidate,
  loading = false,
  compact = false,
}: WishValidationBadgeProps) => {
  const { t, language } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      borderColor: 'border-amber-400/30',
      label: t.wishes.validation.pending,
    },
    approved: {
      icon: CheckCircle2,
      color: 'text-healer',
      bgColor: 'bg-healer/15',
      borderColor: 'border-healer/40',
      label: t.wishes.validation.approved,
    },
    rejected: {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/15',
      borderColor: 'border-destructive/40',
      label: t.wishes.validation.rejected,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center gap-1 px-2 py-1 rounded-md border",
        config.bgColor,
        config.borderColor
      )}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // For GM: show validation actions on hover
  if (isGM && onValidate) {
    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
      >
        {isHovered ? (
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-card/80 border border-border/50 backdrop-blur-sm">
            {/* Approve button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 rounded transition-all",
                status === 'approved' 
                  ? "bg-healer/20 text-healer cursor-default" 
                  : "hover:bg-healer/20 hover:text-healer text-muted-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (status !== 'approved') {
                  onValidate('approved');
                  setIsHovered(false);
                }
              }}
              disabled={status === 'approved'}
              title={t.wishes.validation.approve}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Button>
            
            {/* Reject button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 w-6 p-0 rounded transition-all",
                status === 'rejected' 
                  ? "bg-destructive/20 text-destructive cursor-default" 
                  : "hover:bg-destructive/20 hover:text-destructive text-muted-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (status !== 'rejected') {
                  onValidate('rejected');
                  setIsHovered(false);
                }
              }}
              disabled={status === 'rejected'}
              title={t.wishes.validation.reject}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Button>
            
            {/* Reset button - only show if not pending */}
            {status !== 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded hover:bg-amber-400/20 hover:text-amber-400 text-muted-foreground transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  onValidate('pending');
                  setIsHovered(false);
                }}
                title={t.wishes.validation.reset}
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} />
              </Button>
            )}
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-all",
                  "hover:scale-105 hover:shadow-sm",
                  config.bgColor,
                  config.borderColor,
                  config.color
                )}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {!compact && <span className="text-[10px] font-semibold uppercase tracking-wide">{config.label}</span>}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs bg-card border-border">
                {language === 'fr' ? 'Survolez pour valider' : 'Hover to validate'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // For regular users: display status badge
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md border",
            config.bgColor,
            config.borderColor,
            config.color
          )}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {!compact && <span className="text-[10px] font-semibold uppercase tracking-wide">{config.label}</span>}
          </div>
        </TooltipTrigger>
        {validatedBy && (
          <TooltipContent side="top" className="text-xs bg-card border-border">
            {status === 'approved' ? t.wishes.validation.approvedBy : t.wishes.validation.rejectedBy} {validatedBy}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
