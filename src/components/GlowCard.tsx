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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      onClick={onClick}
      style={style}
      onMouseMove={handleMouseMove}
      className={cn(
        'glass-card',
        hoverable && 'transition-all duration-300',
        hoverable && variantStyles[variant],
        onClick && 'cursor-pointer',
        className
      )}
    >
      <span className="spotlight" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
