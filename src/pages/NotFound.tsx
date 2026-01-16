import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { GlowCard } from "@/components/GlowCard";
import { CosmicButton } from "@/components/CosmicButton";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <CosmicBackground />

      <GlowCard className="w-full max-w-md p-8 text-center relative z-10">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-6xl font-display text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Oops! Page not found
        </p>
        
        <CosmicButton 
          onClick={() => navigate('/')}
          icon={<Home className="h-4 w-4" />}
        >
          Return to Home
        </CosmicButton>
      </GlowCard>
    </div>
  );
};

export default NotFound;
