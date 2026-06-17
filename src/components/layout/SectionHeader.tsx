import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export const SectionHeader = ({ title, description, icon: Icon, className }: SectionHeaderProps) => (
  <div className={cn('flex items-center gap-3', className)}>
    {Icon ? (
      <div className="p-2 rounded-lg bg-primary/20 ring-1 ring-primary/50">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    ) : null}
    <div>
      <h1 className="font-sans text-2xl font-medium text-foreground md:text-3xl">{title}</h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
  </div>
);
