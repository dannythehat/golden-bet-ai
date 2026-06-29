import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const TooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

const Home = lazy(() => import("./pages/PreviewHome"));
const Auth = lazy(() => import("./pages/Auth"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const LeaguePage = lazy(() => import("./pages/LeaguePage"));
const Pricing = lazy(() => import("./pages/Pricing"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const MembersDashboard = lazy(() => import("./pages/MembersDashboard"));
const WorldCupPage = lazy(() => import("./pages/WorldCupPage"));
const SweepstakePage = lazy(() => import("./pages/SweepstakePage"));
const FantasyLeaguePage = lazy(() => import("./pages/FantasyLeaguePage"));
const FormTablesPreview = lazy(() => import("./pages/FormTablesPreview"));
const PLBoard = lazy(() => import("./pages/PLBoard"));
const TodaysFixtures = lazy(() => import("./pages/TodaysFixtures"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
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
                <Route path="/" element={<Home />} />
                <Route path="/index" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/league/:slug" element={<LeaguePage />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/checkout/return" element={<CheckoutReturn />} />
                <Route path="/members" element={<MembersDashboard />} />
                <Route path="/world-cup" element={<WorldCupPage />} />
                <Route path="/sweepstake" element={<SweepstakePage />} />
                <Route path="/fantasy-league" element={<FantasyLeaguePage />} />
                <Route path="/form-tables" element={<FormTablesPreview />} />
                <Route path="/pnl" element={<PLBoard />} />
                <Route path="/fixtures" element={<TodaysFixtures />} />
                <Route path="/preview" element={<Home />} />
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
