import * as React from 'react';

export const CosmicBackground = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    return (
      <div ref={ref} className="fixed inset-0 pointer-events-none overflow-hidden -z-10" {...props}>
        {/* Base very dark background */}
        <div 
          className="absolute inset-0"
          style={{
            background: `hsl(var(--background))`
          }}
        />

        {/* Subtle top gradient glow */}
        <div 
          className="absolute top-0 left-0 right-0 h-[420px]"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.045) 0%, transparent 72%)`
          }}
        />

        {/* Central low-contrast ambient glow */}
        <div 
          className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{
            background: `radial-gradient(ellipse 50% 40% at 50% 50%, hsl(var(--primary) / 0.035) 0%, transparent 72%)`
          }}
        />

        {/* Wider glow at beam base */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-[150px]"
          style={{
            background: `radial-gradient(ellipse 50% 50% at 50% 100%, hsl(var(--primary) / 0.055) 0%, transparent 72%)`
          }}
        />

        {/* Subtle side accent on the left */}
        <div 
          className="absolute top-0 left-0 w-[400px] h-full"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.018) 0%, transparent 50%)`
          }}
        />

        {/* Subtle side accent on the right */}
        <div 
          className="absolute top-0 right-0 w-[400px] h-full"
          style={{
            background: `linear-gradient(225deg, hsl(var(--primary) / 0.018) 0%, transparent 50%)`
          }}
        />

        {/* Grain désactivé pour éviter de masquer l'UI */}
      </div>
    );
  }
);

CosmicBackground.displayName = 'CosmicBackground';
