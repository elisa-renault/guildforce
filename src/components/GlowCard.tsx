import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'horde' | 'alliance';
  hoverable?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export const GlowCard = ({ 
  children, 
  className, 
  variant = 'default',
  hoverable = true,
  onClick,
  style 
}: GlowCardProps) => {
  const variantStyles = {
    default: 'hover:shadow-[0_0_40px_hsl(var(--primary)/0.25)] hover:border-[hsl(var(--primary)/0.4)]',
    horde: 'hover:shadow-[0_0_40px_hsl(var(--horde)/0.35)] hover:border-horde/50',
    alliance: 'hover:shadow-[0_0_40px_hsl(var(--alliance)/0.35)] hover:border-alliance/50',
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        'cosmic-glass',
        hoverable && 'transition-all duration-300 cursor-pointer',
        hoverable && variantStyles[variant],
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
