import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface ContextualToolbarProps {
  leading?: ReactNode;
  children?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export const ContextualToolbar = ({ leading, children, trailing, className }: ContextualToolbarProps) => (
  <div
    className={cn(
      'flex flex-col gap-3 rounded-lg border border-border/40 bg-card/15 p-3 backdrop-blur-sm md:flex-row md:items-center md:justify-between',
      className,
      'w-full max-w-full min-w-0',
    )}
  >
    {leading ? <div className="min-w-0">{leading}</div> : null}
    {children ? <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div> : null}
    {trailing ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{trailing}</div> : null}
  </div>
);
