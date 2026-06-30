import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { appRoutes, getRouteMeta } from "./routes";

import { PostHogAuthSync } from "@/components/analytics/PostHogAuthSync";
import { PostHogConsentSync } from "@/components/analytics/PostHogConsentSync";
import { PostHogErrorBoundary } from "@/components/analytics/PostHogErrorBoundary";
import { Footer } from "@/components/Footer";
import { GlobalNav } from "@/components/GlobalNav";
import { StickyBottomBar } from "@/components/StickyBottomBar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CommandPaletteProvider } from "@/features/command-palette";
import { cn } from "@/lib/utils";

import "@/lib/logCapture";

const queryClient = new QueryClient(); // Rebuild trigger

const decodeSlug = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;

  try {
    return decodeURIComponent(value).replace(/-/g, " ");
  } catch {
    return value.replace(/-/g, " ");
  }
};

const toTitleCase = (value: string) =>
  value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

type GuildWorkspaceFallbackTab = "overview" | "roster" | "polls" | "members" | "atlas" | "vault" | "settings";

const getGuildWorkspaceTab = (pathname: string): GuildWorkspaceFallbackTab => {
  if (pathname.includes("/roster") || pathname.includes("/wishes") || pathname.includes("/member/")) return "roster";
  if (pathname.includes("/poll")) return "polls";
  if (pathname.includes("/members")) return "members";
  if (pathname.includes("/atlas")) return "atlas";
  if (pathname.includes("/vault")) return "vault";
  if (pathname.includes("/settings")) return "settings";
  return "overview";
};

const fallbackNavItems: Array<{ id: GuildWorkspaceFallbackTab; path: string }> = [
  { id: "overview", path: "" },
  { id: "roster", path: "/roster" },
  { id: "polls", path: "/polls" },
  { id: "members", path: "/members" },
  { id: "atlas", path: "/atlas" },
];

const GuildWorkspaceLoadingFallback = ({ pathname }: { pathname: string }) => {
  const [, , regionSlug, serverSlug, guildSlug] = pathname.split("/");
  const guildName = toTitleCase(decodeSlug(guildSlug, "Guild"));
  const serverName = toTitleCase(decodeSlug(serverSlug, ""));
  const regionName = regionSlug?.toUpperCase() || "";
  const basePath = `/guild/${regionSlug || ""}/${serverSlug || ""}/${guildSlug || ""}`;
  const activeTab = getGuildWorkspaceTab(pathname);

  return (
    <div className="relative flex-1 pt-[calc(3.5rem+var(--global-nav-extra-offset,0px))]">
      <div className="relative z-10 lg:grid lg:grid-cols-[272px_minmax(0,1fr)]" style={{ minHeight: "calc(100dvh - 3.5rem - var(--global-nav-extra-offset, 0px))" }}>
        <aside className="hidden lg:block" aria-label={guildName}>
          <div
            className="fixed bottom-0 left-0 z-20 flex min-h-0 w-[272px] flex-col border-r border-border/35 bg-background/88"
            style={{ top: "calc(3.5rem + var(--global-nav-extra-offset, 0px))" }}
          >
            <div className="flex h-full min-h-0 flex-col gap-2.5 p-2.5">
              <div className="rounded-md px-2 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/50 bg-muted/30 text-sm font-semibold">
                    {guildName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{guildName}</p>
                    <p className="truncate text-xs text-muted-foreground">{serverName} · {regionName}</p>
                  </div>
                </div>
              </div>

              <nav className="flex min-h-0 flex-1 flex-col gap-0.5 px-1" aria-hidden="true">
                {fallbackNavItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`${basePath}${item.path}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded px-2.5 text-sm font-medium text-muted-foreground",
                        active && "border-l-2 border-primary bg-primary/10 pl-2 text-foreground",
                      )}
                    >
                      <span className="h-4 w-4 shrink-0 rounded border border-current/30" />
                      <span className={cn("h-3 rounded bg-current/20", active ? "w-28" : "w-24")} />
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[calc(100dvh-3.5rem-var(--global-nav-extra-offset,0px))] items-center justify-center px-4 py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppLayout = () => {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const routeLayout = routeMeta?.layout ?? "public";
  const showFooter = routeLayout === "public" || routeMeta?.showFooter === true;
  const suspenseFallback = routeLayout === "guild-workspace"
    ? <GuildWorkspaceLoadingFallback pathname={location.pathname} />
    : <LoadingScreen message="Loading..." />;

  return (
    <>
      <GlobalNav />
      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col transition-[padding-top] duration-200",
          routeLayout === "app" && "pt-[calc(3.5rem+var(--global-nav-extra-offset,0px))]",
        )}
        style={routeLayout === "public" ? { paddingTop: 'var(--global-nav-extra-offset, 0px)' } : undefined}
      >
        <Suspense fallback={suspenseFallback}>
          <Routes>
            {appRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </Suspense>
      </div>
      <StickyBottomBar />
      {showFooter ? <Footer /> : null}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <PostHogErrorBoundary>
          <PostHogConsentSync />
          <PostHogAuthSync />
          <TooltipProvider>
            <div className="dark flex min-h-dvh min-h-screen flex-col">
              <Sonner />
              <BrowserRouter>
                <CommandPaletteProvider>
                  <AppLayout />
                </CommandPaletteProvider>
              </BrowserRouter>
            </div>
          </TooltipProvider>
        </PostHogErrorBoundary>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
