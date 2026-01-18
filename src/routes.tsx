import { lazy } from "react";
import type { ReactNode } from "react";

type AppRoute = {
  path: string;
  element: ReactNode;
};

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const GuildList = lazy(() => import("./pages/GuildList"));
const Wishes = lazy(() => import("./pages/Wishes"));
const MemberWishes = lazy(() => import("./pages/MemberWishes"));
const Overview = lazy(() => import("./pages/Overview"));
const RosterWishes = lazy(() => import("./pages/RosterWishes"));
const GuildSettings = lazy(() => import("./pages/GuildSettings"));
const GuildPolls = lazy(() => import("./pages/GuildPolls"));
const GuildPollNew = lazy(() => import("./pages/GuildPollNew"));
const GuildPollView = lazy(() => import("./pages/GuildPollView"));
const GuildPollResults = lazy(() => import("./pages/GuildPollResults"));
const GuildMembers = lazy(() => import("./pages/GuildMembers"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Forum = lazy(() => import("./pages/Forum"));
const ForumCategory = lazy(() => import("./pages/ForumCategory"));
const ForumNewTopic = lazy(() => import("./pages/ForumNewTopic"));
const ForumTopic = lazy(() => import("./pages/ForumTopic"));
const ForumAdmin = lazy(() => import("./pages/ForumAdmin"));
const Admin = lazy(() => import("./pages/Admin"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const Changelog = lazy(() => import("./pages/Changelog"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const appRoutes: AppRoute[] = [
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Auth /> },
  { path: "/guilds", element: <GuildList /> },
  { path: "/profile", element: <Profile /> },
  { path: "/u/:username", element: <PublicProfile /> },
  { path: "/forum", element: <Forum /> },
  { path: "/forum/admin", element: <ForumAdmin /> },
  { path: "/admin", element: <Admin /> },
  { path: "/legal", element: <LegalPage /> },
  { path: "/privacy", element: <LegalPage /> },
  { path: "/terms", element: <LegalPage /> },
  { path: "/changelog", element: <Changelog /> },
  { path: "/forum/category/:categorySlug", element: <ForumCategory /> },
  { path: "/forum/category/:categorySlug/new", element: <ForumNewTopic /> },
  { path: "/forum/topic/:topicId", element: <ForumTopic /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug", element: <Overview /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/roster", element: <RosterWishes /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/wishes", element: <Wishes /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/settings", element: <GuildSettings /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/member/:memberId", element: <MemberWishes /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/polls", element: <GuildPolls /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/polls/new", element: <GuildPollNew /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/polls/:pollId/edit", element: <GuildPollNew /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/poll/:pollId", element: <GuildPollView /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/poll/:pollId/results", element: <GuildPollResults /> },
  { path: "/guild/:regionSlug/:serverSlug/:guildSlug/members", element: <GuildMembers /> },
  { path: "*", element: <NotFound /> },
];
