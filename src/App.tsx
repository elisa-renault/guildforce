import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalNav } from "@/components/GlobalNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import JoinGuild from "./pages/JoinGuild";
import GuildList from "./pages/GuildList";
import Wishes from "./pages/Wishes";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <div className="dark">
            <div className="grain-overlay" />
            <Toaster />
            <BrowserRouter>
              <GlobalNav />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/guilds" element={<GuildList />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/guild/join" element={<JoinGuild />} />
                <Route path="/guild/:guildId" element={<Dashboard />} />
                <Route path="/guild/:guildId/wishes" element={<Wishes />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
