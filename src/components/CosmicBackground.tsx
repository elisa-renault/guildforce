export const CosmicBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Base very dark background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `hsl(var(--background))`
        }}
      />

      {/* Subtle top gradient glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-[600px]"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 70%)`
        }}
      />

      {/* Central ellipse glow */}
      <div 
        className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, hsl(var(--primary) / 0.1) 0%, transparent 70%)`
        }}
      />

      {/* Arc lines - decorative curves */}
      <div 
        className="absolute top-[35%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] border border-white/[0.03] rounded-[50%]"
      />
      <div 
        className="absolute top-[38%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] border border-white/[0.02] rounded-[50%]"
      />

      {/* Light beam from center bottom */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-[300px]"
        style={{
          background: `linear-gradient(to top, hsl(var(--primary) / 0.4) 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)`
        }}
      />

      {/* Wider glow at beam base */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200px] h-[150px]"
        style={{
          background: `radial-gradient(ellipse 50% 50% at 50% 100%, hsl(var(--primary) / 0.2) 0%, transparent 70%)`
        }}
      />

      {/* Subtle side accent on the left */}
      <div 
        className="absolute top-0 left-0 w-[400px] h-full"
        style={{
          background: `linear-gradient(135deg, hsl(var(--primary) / 0.03) 0%, transparent 50%)`
        }}
      />

      {/* Subtle side accent on the right */}
      <div 
        className="absolute top-0 right-0 w-[400px] h-full"
        style={{
          background: `linear-gradient(225deg, hsl(var(--primary) / 0.03) 0%, transparent 50%)`
        }}
      />

      {/* Grain désactivé pour éviter de masquer l'UI */}
    </div>
  );
};
