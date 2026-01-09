import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'horde' | 'alliance' | 'liquid';
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
    liquid: 'hover:border-white/15 hover:shadow-[0_12px_40px_hsl(0_0%_0%/0.4)]',
  };

  const isLiquid = variant === 'liquid';

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        isLiquid ? 'liquid-glass' : 'cosmic-glass',
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
