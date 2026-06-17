import { ReactNode, CSSProperties, MouseEvent, forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
  surface?: 'panel' | 'section' | 'flat';
}

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  ({ children, className, hoverable = true, onClick, style, surface = 'panel' }, ref) => {
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
      e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'min-w-0 transition-colors duration-150',
          surface === 'panel' && 'glass-card p-4',
          surface === 'section' && 'section-surface p-3 md:p-4',
          surface === 'flat' && 'relative overflow-visible',
          hoverable && surface !== 'flat' && 'hover:border-primary/30',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        onMouseMove={hoverable ? handleMouseMove : undefined}
        style={style}
      >
        {surface === 'panel' ? <span className="spotlight" /> : null}
        {children}
      </div>
    );
  }
);

GlowCard.displayName = 'GlowCard';
