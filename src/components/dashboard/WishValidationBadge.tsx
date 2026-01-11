import { useState } from 'react';
import { Check, X, RotateCcw, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
  const [showActions, setShowActions] = useState(false);

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      label: t.wishes.validation.pending,
    },
    approved: {
      icon: CheckCircle2,
      color: 'text-healer',
      bgColor: 'bg-healer/20',
      label: t.wishes.validation.approved,
    },
    rejected: {
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/20',
      label: t.wishes.validation.rejected,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // For GM: show validation buttons on hover
  if (isGM && onValidate) {
    return (
      <div 
        className="relative flex items-center gap-1"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions ? (
          <div className="flex items-center gap-0.5">
            {status !== 'approved' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-healer/20 hover:text-healer"
                onClick={(e) => {
                  e.stopPropagation();
                  onValidate('approved');
                  setShowActions(false);
                }}
                disabled={loading}
                title={t.wishes.validation.approve}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {status !== 'rejected' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onValidate('rejected');
                  setShowActions(false);
                }}
                disabled={loading}
                title={t.wishes.validation.reject}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {status !== 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted hover:text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onValidate('pending');
                  setShowActions(false);
                }}
                disabled={loading}
                title={t.wishes.validation.reset}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer",
                  config.bgColor,
                  config.color
                )}>
                  <Icon className="h-3 w-3" />
                  {!compact && <span>{config.label}</span>}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {language === 'fr' ? 'Cliquez pour valider' : 'Click to validate'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // For regular users: just display the badge
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
            config.bgColor,
            config.color
          )}>
            <Icon className="h-3 w-3" />
            {!compact && <span>{config.label}</span>}
          </div>
        </TooltipTrigger>
        {validatedBy && (
          <TooltipContent side="top" className="text-xs">
            {status === 'approved' ? t.wishes.validation.approvedBy : t.wishes.validation.rejectedBy} {validatedBy}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
