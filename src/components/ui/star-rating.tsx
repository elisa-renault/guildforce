import { Star } from 'lucide-react';
import { useState, useCallback } from 'react';

import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  allowHalf?: boolean;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const StarRating = ({
  value,
  onChange,
  max = 5,
  allowHalf = true,
  size = 'md',
  disabled = false,
  className,
}: StarRatingProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  const handleClick = useCallback(
    (starIndex: number, isLeftHalf: boolean) => {
      if (disabled) return;
      const newValue = allowHalf && isLeftHalf ? starIndex + 0.5 : starIndex + 1;
      // If clicking on the same value, reset to 0
      if (newValue === value) {
        onChange(0);
      } else {
        onChange(newValue);
      }
    },
    [allowHalf, disabled, onChange, value]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeftHalf = x < rect.width / 2;
      const newHoverValue = allowHalf && isLeftHalf ? starIndex + 0.5 : starIndex + 1;
      setHoverValue(newHoverValue);
    },
    [allowHalf, disabled]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverValue(null);
  }, []);

  const displayValue = hoverValue ?? value;

  return (
    <div
      className={cn(
        'inline-flex items-center',
        gapClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: max }, (_, index) => {
        const fillPercentage = Math.max(0, Math.min(1, displayValue - index));

        return (
          <div
            key={index}
            className={cn(
              'relative cursor-pointer transition-transform hover:scale-110',
              disabled && 'cursor-not-allowed hover:scale-100'
            )}
            onMouseMove={(e) => handleMouseMove(e, index)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const isLeftHalf = x < rect.width / 2;
              handleClick(index, isLeftHalf);
            }}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(
                sizeClasses[size],
                'text-muted-foreground/30 stroke-[1.5]'
              )}
            />
            {/* Foreground star (filled) with clip mask */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage * 100}%` }}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'fill-status-warning text-status-warning stroke-[1.5]'
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Display-only version for results
interface StarDisplayProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StarDisplay = ({
  value,
  max = 5,
  size = 'md',
  className,
}: StarDisplayProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-0.5',
    lg: 'gap-1',
  };

  return (
    <div className={cn('inline-flex items-center', gapClasses[size], className)}>
      {Array.from({ length: max }, (_, index) => {
        const fillPercentage = Math.max(0, Math.min(1, value - index));

        return (
          <div key={index} className="relative">
            {/* Background star (empty) */}
            <Star
              className={cn(
                sizeClasses[size],
                'text-muted-foreground/30 stroke-[1.5]'
              )}
            />
            {/* Foreground star (filled) with clip mask */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage * 100}%` }}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'fill-status-warning text-status-warning stroke-[1.5]'
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
