import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CosmicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'horde' | 'alliance' | 'outline';
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
  const baseStyles = 'relative overflow-hidden font-semibold rounded-lg transition-all duration-300 inline-flex items-center justify-center gap-2';
  
  const variantStyles = {
    default: 'bg-gradient-to-r from-[hsl(280_45%_32%)] to-[hsl(280_45%_44%)] text-white border border-white/5 hover:shadow-[0_8px_25px_hsl(var(--primary)/0.3)]',
    horde: 'bg-gradient-to-r from-[hsl(5_60%_36%)] to-[hsl(5_60%_48%)] text-white border border-white/5 hover:shadow-[0_8px_25px_hsl(var(--horde)/0.4)]',
    alliance: 'bg-gradient-to-r from-[hsl(215_55%_38%)] to-[hsl(215_55%_50%)] text-white border border-white/5 hover:shadow-[0_8px_25px_hsl(var(--alliance)/0.4)]',
    outline: 'liquid-glass-button text-foreground',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        !disabled && 'hover:-translate-y-0.5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {/* Shine effect */}
      {!disabled && variant !== 'outline' && (
        <span className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500 group-hover:left-[100%]" />
      )}
      
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      
      <span className="relative z-10">{children}</span>
    </button>
  );
});

CosmicButton.displayName = 'CosmicButton';
