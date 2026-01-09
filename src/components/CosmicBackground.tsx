import { useMemo } from 'react';

interface CosmicOrb {
  id: number;
  color: string;
  size: number;
  x: number;
  y: number;
  animation: string;
}

interface CosmicBackgroundProps {
  variant?: 'default' | 'horde' | 'alliance';
}

export const CosmicBackground = ({ variant = 'default' }: CosmicBackgroundProps) => {
  const orbs = useMemo<CosmicOrb[]>(() => {
    const baseOrbs: CosmicOrb[] = [
      { id: 1, color: '', size: 400, x: 20, y: 15, animation: 'animate-float' },
      { id: 2, color: '', size: 350, x: 70, y: 60, animation: 'animate-float-delayed' },
      { id: 3, color: '', size: 300, x: 10, y: 70, animation: 'animate-float-slow' },
      { id: 4, color: '', size: 250, x: 80, y: 20, animation: 'animate-float' },
    ];

    // Assign colors based on variant
    const colors = {
      default: [
        'bg-[hsl(var(--orb-cyan))]',
        'bg-[hsl(var(--orb-purple))]',
        'bg-[hsl(var(--orb-magenta))]',
        'bg-[hsl(var(--orb-cyan))]',
      ],
      horde: [
        'bg-horde',
        'bg-[hsl(15_100%_50%)]',
        'bg-[hsl(30_100%_45%)]',
        'bg-horde',
      ],
      alliance: [
        'bg-alliance',
        'bg-[hsl(200_100%_65%)]',
        'bg-[hsl(220_90%_55%)]',
        'bg-alliance',
      ],
    };

    return baseOrbs.map((orb, i) => ({
      ...orb,
      color: colors[variant][i],
    }));
  }, [variant]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--orb-purple) / 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--orb-cyan) / 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 50% 35% at 0% 80%, hsl(var(--orb-magenta) / 0.06) 0%, transparent 50%),
            hsl(var(--background))
          `,
        }}
      />

      {/* Animated orbs */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={`absolute rounded-full ${orb.color} opacity-20 blur-[100px] animate-pulse-glow ${orb.animation}`}
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
