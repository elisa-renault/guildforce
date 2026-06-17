import * as React from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const filterControlClassName =
  'h-8 rounded border-border/45 bg-card/55 px-2.5 text-sm font-medium text-foreground/85 shadow-none backdrop-blur-0 hover:bg-card/75 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1';

export const activeFilterControlClassName =
  'border-primary/45 bg-primary/10 text-foreground hover:bg-primary/15';

export const filterSelectTriggerClassName =
  'h-8 rounded border-border/45 bg-card/55 px-2.5 text-sm font-medium text-foreground/85 shadow-none backdrop-blur-0 hover:bg-card/75 focus:ring-1 focus:ring-ring focus:ring-offset-1';

export const FilterBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mb-4 flex min-w-0 flex-wrap items-center gap-2 overflow-x-auto pb-1 md:overflow-visible md:pb-0',
        className,
      )}
      {...props}
    />
  ),
);
FilterBar.displayName = 'FilterBar';

type FilterSearchFieldProps = React.ComponentProps<typeof Input> & {
  containerClassName?: string;
};

export const FilterSearchField = React.forwardRef<HTMLInputElement, FilterSearchFieldProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div className={cn('relative min-w-[200px] flex-1 sm:flex-none', containerClassName)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
      />
      <Input
        ref={ref}
        className={cn(
          'h-8 rounded border-border/45 bg-card/55 pl-8 text-sm shadow-none backdrop-blur-0 placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
FilterSearchField.displayName = 'FilterSearchField';
