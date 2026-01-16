import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalNav } from "@/components/GlobalNav";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { BugReportButton } from "@/components/BugReportButton";
import "@/lib/logCapture";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import GuildList from "./pages/GuildList";
import Wishes from "./pages/Wishes";
import MemberWishes from "./pages/MemberWishes";
import Overview from "./pages/Overview";
import RosterWishes from "./pages/RosterWishes";
import GuildSettings from "./pages/GuildSettings";
import GuildPolls from "./pages/GuildPolls";
import GuildPollNew from "./pages/GuildPollNew";
import GuildPollView from "./pages/GuildPollView";
import GuildPollResults from "./pages/GuildPollResults";

import GuildMembers from "./pages/GuildMembers";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Forum from "./pages/Forum";
import ForumCategory from "./pages/ForumCategory";
import ForumNewTopic from "./pages/ForumNewTopic";
import ForumTopic from "./pages/ForumTopic";
import ForumAdmin from "./pages/ForumAdmin";
import Admin from "./pages/Admin";
import LegalPage from "./pages/LegalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <div className="dark min-h-screen flex flex-col">
            <Toaster />
            <BrowserRouter>
              <GlobalNav />
              <div className="flex-1 flex flex-col relative z-10">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/guilds" element={<GuildList />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/forum" element={<Forum />} />
                  <Route path="/forum/admin" element={<ForumAdmin />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/legal" element={<LegalPage />} />
                  <Route path="/privacy" element={<LegalPage />} />
                  <Route path="/terms" element={<LegalPage />} />
                  <Route path="/forum/category/:categorySlug" element={<ForumCategory />} />
                  <Route path="/forum/category/:categorySlug/new" element={<ForumNewTopic />} />
                  <Route path="/forum/topic/:topicId" element={<ForumTopic />} />
                  {/* Guild routes - new structure */}
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug" element={<Overview />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/roster" element={<RosterWishes />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/wishes" element={<Wishes />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/settings" element={<GuildSettings />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/member/:memberId" element={<MemberWishes />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/polls" element={<GuildPolls />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/polls/new" element={<GuildPollNew />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/polls/:pollId/edit" element={<GuildPollNew />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/poll/:pollId" element={<GuildPollView />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/poll/:pollId/results" element={<GuildPollResults />} />
                  <Route path="/guild/:regionSlug/:serverSlug/:guildSlug/members" element={<GuildMembers />} />
                  <Route path="*" element={<NotFound />} />
              </Routes>
              </div>
              <BugReportButton />
              <CookieBanner />
              <Footer />
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
