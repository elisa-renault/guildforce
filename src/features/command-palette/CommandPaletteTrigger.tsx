import { Search } from 'lucide-react';

import { useCommandPalette } from './CommandPaletteContext';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CommandPaletteTriggerProps {
  variant?: 'search' | 'icon';
  className?: string;
}

export const CommandPaletteTrigger = ({ variant = 'search', className }: CommandPaletteTriggerProps) => {
  const { open, shortcutLabel } = useCommandPalette();
  const { t } = useLanguage();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={open}
        className={cn(
          'grid h-8 w-8 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
        aria-label={t.commandPalette.open}
      >
        <Search className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'flex h-9 w-full max-w-[320px] items-center gap-2 rounded border border-border/35 bg-background/45 px-3 text-sm text-muted-foreground/85 transition-colors hover:border-primary/25 hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background xl:max-w-[360px] 2xl:max-w-[400px]',
        className,
      )}
      aria-label={t.commandPalette.open}
    >
      <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left">{t.commandPalette.open}</span>
      <kbd className="hidden shrink-0 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground xl:inline-flex">
        {shortcutLabel}
      </kbd>
    </button>
  );
};
