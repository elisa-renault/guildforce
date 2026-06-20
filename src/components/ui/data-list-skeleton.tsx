import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DataListSkeletonProps {
  rows?: number;
  showToolbar?: boolean;
  showMeta?: boolean;
  variant?: 'table' | 'cards';
  className?: string;
}

export const DataListSkeleton = ({
  rows = 8,
  showToolbar = true,
  showMeta = true,
  variant = 'table',
  className,
}: DataListSkeletonProps) => (
  <div
    className={cn('space-y-3', className)}
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    {showToolbar ? (
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full md:w-[280px]" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
    ) : null}

    {showMeta ? <Skeleton className="h-4 w-72 max-w-full" /> : null}

    <div className="overflow-hidden rounded-lg border border-border/45 bg-card/25">
      <div className={cn(variant === 'cards' ? 'space-y-2 p-2' : 'space-y-px')}>
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'bg-background/20',
              variant === 'cards'
                ? 'rounded-md border border-border/35 p-3'
                : 'px-3 py-3',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36 max-w-[70%]" />
                <Skeleton className="h-3 w-24 max-w-[55%]" />
              </div>
              <Skeleton className="hidden h-7 w-24 shrink-0 sm:block" />
              <Skeleton className="hidden h-7 w-32 shrink-0 md:block" />
              <Skeleton className="h-7 w-7 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
    <span className="sr-only">Loading</span>
  </div>
);
