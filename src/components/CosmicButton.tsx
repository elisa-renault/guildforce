import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CosmicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
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
  const baseStyles = 'relative overflow-hidden font-normal transition-all duration-300 inline-flex items-center justify-center gap-2';
  
  const variantStyles = {
    default: 'cosmic' as const,
    outline: 'cosmicOutline' as const,
  };

  const sizeStyles = {
    sm: 'h-9 px-4 text-sm rounded-md',
    md: 'h-10 px-6 text-base rounded-md',
    lg: 'h-11 px-8 text-lg rounded-md',
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <Button
      ref={ref}
      type={props.type ?? 'button'}
      variant={variantStyles[variant]}
      size="none"
      disabled={disabled || loading}
      className={cn(
        baseStyles,
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
      {children}
    </Button>
  );
});

CosmicButton.displayName = 'CosmicButton';
