import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

interface PaywallProps {
  children: ReactNode;
  title?: string;
  message?: string;
}

export function Paywall({ children, title = "Inner Circle Pick", message }: PaywallProps) {
  const { isActive, loading } = useSubscription();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="min-h-[120px] animate-pulse bg-muted/20 rounded-lg" />;
  if (isActive) return <>{children}</>;

  return (
    <div className="relative rounded-xl border border-primary/30 bg-card overflow-hidden">
      <div className="pointer-events-none select-none blur-md opacity-40 p-4">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-background/60 to-background/95">
        <div className="rounded-full bg-primary/15 p-3 mb-3">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-semibold text-base mb-1 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" /> {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
          {message ?? "Due to growing demand and to keep the lights on, we've added a tiny £3/mo for premium picks. Free stuff stays free."}
        </p>
        <Button size="sm" onClick={() => navigate(isAuthenticated ? "/pricing" : "/auth?next=/pricing")}>
          Unlock for £3/mo
        </Button>
      </div>
    </div>
  );
}
