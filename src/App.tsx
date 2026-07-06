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
const Pricing = lazy(() => import("./pages/Pricing"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const MembersDashboard = lazy(() => import("./pages/MembersDashboard"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const FormTables = lazy(() => import("./pages/FormTables"));
const ValueBoard = lazy(() => import("./pages/ValueBoard"));
const FantasyLeague = lazy(() => import("./pages/FantasyLeague"));
const Pnl = lazy(() => import("./pages/Pnl"));
const FantasyWaitlist = lazy(() => import("./pages/FantasyWaitlist"));
const AdminWaitlist = lazy(() => import("./pages/AdminWaitlist"));
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
                {/* KEEP */}
                <Route path="/" element={<Home />} />
                <Route path="/preview" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/checkout/return" element={<CheckoutReturn />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/members" element={<MembersDashboard />} />

                {/* Placeholder shells — to be rebuilt from scratch */}
                <Route path="/fantasy-league" element={<FantasyLeague />} />
                {/* Team management is locked until the membership opens (1 Aug). */}
                <Route path="/fantasy-league/my-team" element={<ComingSoon title="My Team" eyebrow="Coming 1st August" description="Team building opens with the membership on 1st August — the Premier League season kicks off Sat 22nd. Join the fantasy waitlist to be first in." />} />
                <Route path="/fantasy-league/transfers" element={<ComingSoon title="Transfers" eyebrow="Coming 1st August" description="The transfer market opens with the membership on 1st August. Join the fantasy waitlist to be first in." />} />
                <Route path="/fantasy-league/results" element={<ComingSoon title="Gameweek Results" eyebrow="Coming 1st August" description="Gameweek results go live once the season kicks off on Sat 22nd August. Join the fantasy waitlist to be first in." />} />
                <Route path="/form-tables" element={<FormTables />} />
                <Route path="/value-board" element={<ValueBoard />} />
                <Route path="/match-insights" element={<ValueBoard />} />
                <Route path="/fixtures" element={<ComingSoon title="Today's Fixtures" eyebrow="In Build" />} />
                <Route path="/tips" element={<ComingSoon title="Daily Tips" eyebrow="In Build" />} />
                <Route path="/pnl" element={<Pnl />} />
                <Route path="/fantasy-waitlist" element={<FantasyWaitlist />} />
                <Route path="/admin" element={<AdminWaitlist />} />
                <Route path="/the-gaffer" element={<ComingSoon title="The Gaffer" eyebrow="In Build" />} />
                <Route path="/community" element={<ComingSoon title="Community" eyebrow="In Build" />} />

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
