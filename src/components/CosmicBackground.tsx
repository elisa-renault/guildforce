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
      { id: 1, color: '', size: 350, x: 15, y: 10, animation: 'animate-float', opacity: 0.08 },
      { id: 2, color: '', size: 300, x: 75, y: 55, animation: 'animate-float-delayed', opacity: 0.06 },
      { id: 3, color: '', size: 250, x: 5, y: 75, animation: 'animate-float-slow', opacity: 0.05 },
      { id: 4, color: '', size: 200, x: 85, y: 15, animation: 'animate-float', opacity: 0.07 },
    ];

    // Assign colors based on variant - more subtle palette
    const colors = {
      default: [
        'bg-[hsl(280_50%_40%)]', // plum
        'bg-[hsl(42_60%_40%)]',  // gold muted
        'bg-[hsl(270_45%_35%)]', // violet
        'bg-[hsl(280_45%_38%)]', // plum lighter
      ],
      horde: [
        'bg-[hsl(5_70%_40%)]',
        'bg-[hsl(15_65%_35%)]',
        'bg-[hsl(0_60%_35%)]',
        'bg-[hsl(10_70%_38%)]',
      ],
      alliance: [
        'bg-[hsl(215_65%_45%)]',
        'bg-[hsl(210_60%_40%)]',
        'bg-[hsl(220_55%_38%)]',
        'bg-[hsl(215_60%_42%)]',
      ],
    };

    return baseOrbs.map((orb, i) => ({
      ...orb,
      color: colors[variant][i],
    }));
  }, [variant]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base gradient - subtle plum tones */}
      <div 
        className="absolute inset-0"
        style={{
          background: variant === 'default' 
            ? `
              radial-gradient(ellipse 70% 50% at 50% 0%, hsl(280 40% 20% / 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 100% 100%, hsl(42 50% 30% / 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 0% 80%, hsl(270 35% 25% / 0.08) 0%, transparent 50%),
              hsl(var(--background))
            `
            : variant === 'horde'
            ? `
              radial-gradient(ellipse 70% 50% at 50% 0%, hsl(5 60% 25% / 0.15) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 100% 100%, hsl(15 50% 20% / 0.1) 0%, transparent 50%),
              hsl(var(--background))
            `
            : `
              radial-gradient(ellipse 70% 50% at 50% 0%, hsl(215 50% 30% / 0.15) 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 100% 100%, hsl(210 45% 25% / 0.1) 0%, transparent 50%),
              hsl(var(--background))
            `,
        }}
      />

      {/* Animated orbs - very subtle */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={`absolute rounded-full ${orb.color} blur-[120px] ${orb.animation}`}
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

      {/* Very subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
