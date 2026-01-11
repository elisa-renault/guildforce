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
import GuildList from "./pages/GuildList";
import Wishes from "./pages/Wishes";
import MemberWishes from "./pages/MemberWishes";
import Dashboard from "./pages/Dashboard";
import GuildSettings from "./pages/GuildSettings";
import Profile from "./pages/Profile";
import Forum from "./pages/Forum";
import ForumCategory from "./pages/ForumCategory";
import ForumNewTopic from "./pages/ForumNewTopic";
import ForumTopic from "./pages/ForumTopic";
import ForumAdmin from "./pages/ForumAdmin";
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
                <Route path="/forum" element={<Forum />} />
                <Route path="/forum/admin" element={<ForumAdmin />} />
                <Route path="/forum/category/:categorySlug" element={<ForumCategory />} />
                <Route path="/forum/category/:categorySlug/new" element={<ForumNewTopic />} />
                <Route path="/forum/topic/:topicId" element={<ForumTopic />} />
                <Route path="/guild/:regionSlug/:serverSlug/:guildSlug" element={<Dashboard />} />
                <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/wishes" element={<Wishes />} />
                <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/settings" element={<GuildSettings />} />
                <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/member/:memberId" element={<MemberWishes />} />
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
