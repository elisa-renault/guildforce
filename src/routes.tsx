import { lazy, type ReactNode } from "react";
import { matchPath } from "react-router-dom";

import Index from "./pages/Index";
import type { Translations } from "@/i18n/translations";

export type RouteLabelKey = keyof Translations["routeMeta"];

export type RouteBreadcrumb = Array<{
  label?: string;
  labelKey?: RouteLabelKey;
  href?: string;
}>;

type AppRoute = {
  path: string;
  element: ReactNode;
  title?: RouteLabelKey;
  layout?: 'public' | 'app' | 'guild-workspace';
  requiresAuth?: boolean;
  breadcrumb?: RouteBreadcrumb;
  navLabel?: RouteLabelKey;
  showInNav?: boolean;
  hideGlobalNav?: boolean;
  showFooter?: boolean;
};

const Auth = lazy(() => import("./pages/Auth"));
const GuildList = lazy(() => import("./pages/GuildList"));
const Wishes = lazy(() => import("./pages/Wishes"));
const MemberWishes = lazy(() => import("./pages/MemberWishes"));
const Overview = lazy(() => import("./pages/Overview"));
const RosterWishes = lazy(() => import("./pages/RosterWishes"));
const GuildVault = lazy(() => import("./pages/GuildVault"));
const GuildSettings = lazy(() => import("./pages/GuildSettings"));
const GuildPolls = lazy(() => import("./pages/GuildPolls"));
const GuildPollNew = lazy(() => import("./pages/GuildPollNew"));
const GuildPollView = lazy(() => import("./pages/GuildPollView"));
const GuildPollResults = lazy(() => import("./pages/GuildPollResults"));
const GuildMembers = lazy(() => import("./pages/GuildMembers"));
const GuildAtlas = lazy(() => import("./pages/GuildAtlas"));
const GuildAtlasEditor = lazy(() => import("./pages/GuildAtlasEditor"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminDesignSystemPage = lazy(() => import("./pages/AdminDesignSystemPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const Changelog = lazy(() => import("./pages/Changelog"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    element: <Index />,
    title: "home",
    layout: "public",
    breadcrumb: [{ labelKey: "home", href: "/" }],
  },
  {
    path: "/auth",
    element: <Auth />,
    title: "auth",
    layout: "public",
    hideGlobalNav: true,
  },
  {
    path: "/guilds",
    element: <GuildList />,
    title: "guilds",
    layout: "app",
    requiresAuth: true,
    navLabel: "guilds",
    showInNav: true,
    showFooter: true,
    breadcrumb: [{ labelKey: "guilds", href: "/guilds" }],
  },
  {
    path: "/profile",
    element: <Profile />,
    title: "profile",
    layout: "app",
    requiresAuth: true,
    navLabel: "profile",
    showInNav: true,
    showFooter: true,
    breadcrumb: [{ labelKey: "profile", href: "/profile" }],
  },
  {
    path: "/u/:username",
    element: <PublicProfile />,
    title: "publicProfile",
    layout: "public",
  },
  {
    path: "/admin",
    element: <Admin />,
    title: "admin",
    layout: "app",
    requiresAuth: true,
    navLabel: "admin",
    showInNav: true,
  },
  {
    path: "/admin/design-system",
    element: <AdminDesignSystemPage />,
    title: "admin",
    layout: "app",
    requiresAuth: true,
  },
  {
    path: "/legal",
    element: <LegalPage />,
    title: "legal",
    layout: "public",
  },
  {
    path: "/privacy",
    element: <LegalPage />,
    title: "privacy",
    layout: "public",
  },
  {
    path: "/terms",
    element: <LegalPage />,
    title: "terms",
    layout: "public",
  },
  {
    path: "/changelog",
    element: <Changelog />,
    title: "changelog",
    layout: "public",
  },
  {
    path: "/changelog/:version",
    element: <Changelog />,
    title: "changelog",
    layout: "public",
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug",
    element: <Overview />,
    title: "guildOverview",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/roster",
    element: <RosterWishes />,
    title: "guildRoster",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/wishes",
    element: <Wishes />,
    title: "guildWishes",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/settings",
    element: <GuildSettings />,
    title: "guildSettings",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/vault",
    element: <GuildVault />,
    title: "guildVault",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/member/:memberId",
    element: <MemberWishes />,
    title: "guildMemberWishes",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/polls",
    element: <GuildPolls />,
    title: "guildPolls",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/polls/new",
    element: <GuildPollNew />,
    title: "guildPollNew",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/polls/:pollId/edit",
    element: <GuildPollNew />,
    title: "guildPollEdit",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/poll/:pollId",
    element: <GuildPollView />,
    title: "guildPollView",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/poll/:pollId/results",
    element: <GuildPollResults />,
    title: "guildPollResults",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/members",
    element: <GuildMembers />,
    title: "guildMembers",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/atlas",
    element: <GuildAtlas />,
    title: "guildAtlas",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/atlas/new",
    element: <GuildAtlasEditor />,
    title: "guildAtlasNew",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  {
    path: "/guild/:regionSlug/:serverSlug/:guildSlug/atlas/:documentId/edit",
    element: <GuildAtlasEditor />,
    title: "guildAtlasEdit",
    layout: "guild-workspace",
    requiresAuth: true,
  },
  { path: "*", element: <NotFound />, title: "notFound", layout: "public" },
];

export const getRouteMeta = (pathname: string) => {
  const matches = appRoutes
    .map((route) => ({
      route,
      match: matchPath(
        { path: route.path, end: route.path !== "*" },
        pathname,
      ),
    }))
    .filter((entry) => entry.match);

  if (matches.length === 0) {
    return undefined;
  }

  return matches.sort((a, b) => {
    const aLength = a.match?.pathnameBase.length ?? 0;
    const bLength = b.match?.pathnameBase.length ?? 0;
    return bLength - aLength;
  })[0].route;
};
