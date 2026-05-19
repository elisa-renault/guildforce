import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-card/15 px-4 py-10 text-center',
      className,
    )}
  >
    {Icon ? (
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border/50 bg-muted/30">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.6} aria-hidden="true" />
      </div>
    ) : null}
    <div className="max-w-md space-y-1">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
