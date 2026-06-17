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
  bordered?: boolean;
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
  bordered = true,
  className,
  titleClassName,
}: PageHeaderProps) => (
  <div
    className={cn(
      'flex flex-col gap-3 md:flex-row md:items-center md:justify-between',
      bordered ? 'border-b border-border/30 pb-3' : 'pb-0',
      className,
      'w-full max-w-full min-w-0',
    )}
  >
    <div className="flex min-w-0 items-center gap-2.5">
      {Icon ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <Icon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className={cn('font-sans text-xl font-medium tracking-normal text-foreground', titleClassName)}>
          {title}
        </h1>
        {description ? <div className="max-w-3xl text-sm leading-5 text-muted-foreground">{description}</div> : null}
        {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
      </div>
    </div>
    {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
  </div>
);
