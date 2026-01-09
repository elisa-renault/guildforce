import { useMemo } from 'react';

interface CosmicOrb {
  id: number;
  color: string;
  size: number;
  x: number;
  y: number;
  animation: string;
  opacity: number;
}

interface CosmicBackgroundProps {
  variant?: 'default' | 'horde' | 'alliance';
}

export const CosmicBackground = ({ variant = 'default' }: CosmicBackgroundProps) => {
  const orbs = useMemo<CosmicOrb[]>(() => {
    const baseOrbs: CosmicOrb[] = [
      { id: 1, color: '', size: 400, x: 15, y: 10, animation: 'animate-float', opacity: 0.04 },
      { id: 2, color: '', size: 350, x: 75, y: 55, animation: 'animate-float-delayed', opacity: 0.03 },
      { id: 3, color: '', size: 300, x: 5, y: 75, animation: 'animate-float-slow', opacity: 0.025 },
      { id: 4, color: '', size: 250, x: 85, y: 15, animation: 'animate-float', opacity: 0.035 },
    ];

    // Assign colors based on variant - very deep and subtle
    const colors = {
      default: [
        'bg-[hsl(280_40%_18%)]', // deep plum
        'bg-[hsl(42_45%_20%)]',  // dark gold
        'bg-[hsl(270_35%_14%)]', // deep violet
        'bg-[hsl(280_35%_16%)]', // dark plum
      ],
      horde: [
        'bg-[hsl(5_50%_18%)]',
        'bg-[hsl(15_45%_16%)]',
        'bg-[hsl(0_45%_14%)]',
        'bg-[hsl(10_50%_17%)]',
      ],
      alliance: [
        'bg-[hsl(215_50%_20%)]',
        'bg-[hsl(210_45%_18%)]',
        'bg-[hsl(220_40%_16%)]',
        'bg-[hsl(215_45%_19%)]',
      ],
    };

    return baseOrbs.map((orb, i) => ({
      ...orb,
      color: colors[variant][i],
    }));
  }, [variant]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base gradient - very dark and subtle */}
      <div 
        className="absolute inset-0"
        style={{
          background: variant === 'default' 
            ? `
              radial-gradient(ellipse 70% 50% at 50% 0%, hsl(280 35% 12% / 0.2) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 100% 100%, hsl(42 40% 15% / 0.12) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 0% 80%, hsl(270 30% 12% / 0.12) 0%, transparent 50%),
              hsl(var(--background))
            `
            : variant === 'horde'
            ? `
              radial-gradient(ellipse 70% 50% at 50% 0%, hsl(5 45% 14% / 0.2) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 100% 100%, hsl(15 40% 12% / 0.12) 0%, transparent 50%),
              hsl(var(--background))
            `
            : `
              radial-gradient(ellipse 70% 50% at 50% 0%, hsl(215 40% 16% / 0.2) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 100% 100%, hsl(210 35% 14% / 0.12) 0%, transparent 50%),
              hsl(var(--background))
            `,
        }}
      />

      {/* Animated orbs - very subtle and blurred */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={`absolute rounded-full ${orb.color} blur-[150px] ${orb.animation}`}
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            transform: 'translate(-50%, -50%)',
            opacity: orb.opacity,
          }}
        />
      ))}
    </div>
  );
};
