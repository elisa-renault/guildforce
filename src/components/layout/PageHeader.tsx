import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  icon: Icon,
  meta,
  actions,
  className,
  titleClassName,
}: PageHeaderProps) => (
  <div
    className={cn(
      'flex flex-col gap-4 rounded-lg border border-border/40 bg-card/20 px-4 py-4 backdrop-blur-sm md:flex-row md:items-start md:justify-between md:px-5',
      className,
    )}
  >
    <div className="flex min-w-0 items-start gap-3">
      {Icon ? (
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/15">
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.7} aria-hidden="true" />
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className={cn('text-xl font-semibold tracking-normal text-foreground md:text-2xl', titleClassName)}>
          {title}
        </h1>
        {description ? <div className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</div> : null}
        {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
      </div>
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
  </div>
);
