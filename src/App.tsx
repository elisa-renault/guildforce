import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { appRoutes, getRouteMeta } from "./routes";

import { PostHogAuthSync } from "@/components/analytics/PostHogAuthSync";
import { PostHogConsentSync } from "@/components/analytics/PostHogConsentSync";
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

const AppLayout = () => {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);
  const routeLayout = routeMeta?.layout ?? "public";
  const showFooter = routeLayout === "public" || routeMeta?.showFooter === true;

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
        <Suspense fallback={<LoadingScreen message="Loading..." />}>
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
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
