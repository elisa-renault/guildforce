import { cn } from '@/lib/utils';

type NavSize = 'xs' | 'sm' | 'md' | 'guild';
type NavHover = 'muted' | 'accent';

const SIZE_MAP: Record<NavSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-3 py-2 text-sm',
  guild: 'p-2 md:px-3 md:py-1.5 text-sm',
};

const HOVER_MAP: Record<NavHover, string> = {
  muted: 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
  accent: 'text-muted-foreground hover:text-foreground hover:bg-accent/20',
};

interface NavItemClassOptions {
  active?: boolean;
  size?: NavSize;
  hover?: NavHover;
  fullWidth?: boolean;
  justifyStart?: boolean;
  className?: string;
}

export const navItemClass = ({
  active = false,
  size = 'md',
  hover = 'muted',
  fullWidth = false,
  justifyStart = false,
  className,
}: NavItemClassOptions) =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap',
    SIZE_MAP[size],
    fullWidth && 'w-full',
    justifyStart && 'justify-start',
    active ? 'bg-primary/10 text-foreground' : HOVER_MAP[hover],
    className,
  );
