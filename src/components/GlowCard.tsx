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
    default: 'hover:border-primary/30 hover:shadow-[0_0_40px_hsl(var(--primary)/0.15)]',
    horde: 'hover:border-horde/40 hover:shadow-[0_0_40px_hsl(var(--horde)/0.25)]',
    alliance: 'hover:border-alliance/40 hover:shadow-[0_0_40px_hsl(var(--alliance)/0.25)]',
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        'glass-card',
        hoverable && 'transition-all duration-300',
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