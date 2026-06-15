import { ReactNode, CSSProperties, MouseEvent, forwardRef } from 'react';

import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
}

export const GlowCard = forwardRef<HTMLDivElement, GlowCardProps>(
  ({ children, className, hoverable = true, onClick, style }, ref) => {
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
          'glass-card min-w-0 p-6 transition-all duration-500',
          hoverable && 'hover:border-primary/30',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
        onMouseMove={hoverable ? handleMouseMove : undefined}
        style={style}
      >
        <span className="spotlight" />
        {children}
      </div>
    );
  }
);

GlowCard.displayName = 'GlowCard';
