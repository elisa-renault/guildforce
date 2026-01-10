import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CosmicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const CosmicButton = forwardRef<HTMLButtonElement, CosmicButtonProps>(({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  ...props
}, ref) => {
  const baseStyles = 'relative overflow-hidden font-normal transition-all duration-300 inline-flex items-center justify-center gap-3';
  
  const variantStyles = {
    default: 'primary-button text-white',
    outline: 'glass-button text-foreground hover:-translate-y-0.5',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm rounded',
    md: 'px-6 py-3 text-base rounded',
    lg: 'px-8 py-4 text-lg rounded',
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50 cursor-not-allowed hover:transform-none hover:shadow-none',
        className
      )}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <span className="spotlight" />
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      
      <span>{children}</span>
    </button>
  );
});

CosmicButton.displayName = 'CosmicButton';
