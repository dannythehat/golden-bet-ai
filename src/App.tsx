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
const Pnl = lazy(() => import("./pages/Pnl"));
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
                <Route path="/fantasy-league" element={<ComingSoon title="Fantasy League" eyebrow="Coming for 2025/26" />} />
                <Route path="/form-tables" element={<FormTables />} />
                <Route path="/fixtures" element={<ComingSoon title="Today's Fixtures" eyebrow="In Build" />} />
                <Route path="/tips" element={<ComingSoon title="Daily Tips" eyebrow="In Build" />} />
                <Route path="/pnl" element={<Pnl />} />
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
