import { useState } from 'react';
import { Check, X, RotateCcw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { ValidationStatus } from '@/types/guild';
import { toneTextClass } from '@/lib/design-tokens';
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
      color: toneTextClass('warning'),
      bgColor: 'bg-status-warning/10',
      borderColor: 'border-status-warning/30',
      label: t.wishes.validation.pending,
    },
    approved: {
      icon: CheckCircle2,
      color: 'text-status-success',
      bgColor: 'bg-status-success/15',
      borderColor: 'border-status-success/40',
      label: t.wishes.validation.approved,
    },
    rejected: {
      icon: XCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
      borderColor: 'border-border/60',
      label: t.wishes.validation.rejected,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const compactBadgeWidth = 'w-[88px]';

  // Loading state - same size as normal badge
  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center h-7 rounded-md border",
        compactBadgeWidth,
        config.bgColor,
        config.borderColor
      )}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // For GM: show validation actions on hover - fixed width container
  if (isGM && onValidate) {
    const handleContainerClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };

    return (
      <div 
        className={cn("relative h-7", compactBadgeWidth)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleContainerClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Actions overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center gap-0.5 rounded-md border transition-opacity duration-150",
          "bg-card/95 border-border/50",
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-5 w-5 p-0 rounded transition-colors",
              status === 'approved' 
                ? "bg-status-success/30 text-status-success" 
                : "hover:bg-status-success/20 hover:text-status-success text-muted-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (status !== 'approved') {
                onValidate('approved');
                setIsHovered(false);
              }
            }}
            title={t.wishes.validation.approve}
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-5 w-5 p-0 rounded transition-colors",
              status === 'rejected' 
                ? "bg-status-error/30 text-status-error" 
                : "hover:bg-status-error/20 hover:text-status-error text-muted-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (status !== 'rejected') {
                onValidate('rejected');
                setIsHovered(false);
              }
            }}
            title={t.wishes.validation.reject}
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </Button>
          
          {status !== 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 rounded hover:bg-status-warning/20 hover:text-status-warning text-muted-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onValidate('pending');
                setIsHovered(false);
              }}
              title={t.wishes.validation.reset}
            >
              <RotateCcw className="h-2.5 w-2.5" strokeWidth={2} />
            </Button>
          )}
        </div>

        {/* Status badge */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center gap-1 rounded-md border transition-opacity duration-150 overflow-hidden px-1",
          config.bgColor,
          config.borderColor,
          config.color,
          isHovered ? "opacity-0 pointer-events-none" : "opacity-100 cursor-pointer"
        )}>
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="text-[10px] font-medium leading-none whitespace-nowrap truncate">
            {config.label}
          </span>
        </div>
      </div>
    );
  }

  // For regular users: display status badge
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "h-7 flex items-center rounded-md border",
            compact ? "w-7 justify-center px-0" : "gap-1.5 px-2",
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
