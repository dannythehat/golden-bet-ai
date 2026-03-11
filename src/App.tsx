import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy-load UI shell components to reduce initial script evaluation
const TooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

const Index = lazy(() => import("./pages/Index"));

// Lazy load non-critical routes to reduce initial JS bundle
const Auth = lazy(() => import("./pages/Auth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const GetKeys = lazy(() => import("./pages/GetKeys"));
const MLDataLoader = lazy(() => import("./pages/MLDataLoader"));
const SportMonksLoader = lazy(() => import("./pages/SportMonksLoader"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));

const BetBuilderPage = lazy(() => import("./pages/BetBuilderPage"));
const AccaDelightPage = lazy(() => import("./pages/AccaDelightPage"));
const OverGoalsPage = lazy(() => import("./pages/OverGoalsPage"));
const OverCornersPage = lazy(() => import("./pages/OverCornersPage"));
const OverCardsPage = lazy(() => import("./pages/OverCardsPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Block right-click
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    // Block Ctrl/Cmd+C, Ctrl/Cmd+A, Ctrl/Cmd+U (view-source)
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'a', 'u', 's'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <Suspense fallback={null}>
      <TooltipProvider>
        <Suspense fallback={null}>
          <Toaster />
          <Sonner />
        </Suspense>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/get-keys" element={<GetKeys />} />
              <Route path="/ml-loader" element={<MLDataLoader />} />
              <Route path="/sportmonks-loader" element={<SportMonksLoader />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/golden-bets" element={<GoldenBets />} />
              <Route path="/bet-builder" element={<BetBuilderPage />} />
              <Route path="/acca-delight" element={<AccaDelightPage />} />
              <Route path="/over-goals" element={<OverGoalsPage />} />
              <Route path="/over-corners" element={<OverCornersPage />} />
              <Route path="/over-cards" element={<OverCardsPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </Suspense>
  </QueryClientProvider>
  );
};

export default App;
