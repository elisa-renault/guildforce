import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalNav } from "@/components/GlobalNav";
import { Footer } from "@/components/Footer";
import { StickyBottomBar } from "@/components/StickyBottomBar";
import { LoadingScreen } from "@/components/ui/loading-screen";
import "@/lib/logCapture";
import { appRoutes } from "./routes";

const queryClient = new QueryClient(); // Rebuild trigger

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <div className="dark min-h-screen flex flex-col">
            <Sonner />
            <BrowserRouter>
              <GlobalNav />
              <div
                className="flex-1 flex flex-col relative z-10 pb-4 transition-[padding-top] duration-200 md:pb-0"
                style={{ paddingTop: 'var(--global-nav-extra-offset, 0px)' }}
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
              <Footer />
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
