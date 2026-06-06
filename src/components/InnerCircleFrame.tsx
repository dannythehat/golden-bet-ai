import { ReactNode } from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

interface InnerCircleFrameProps {
  children: ReactNode;
  className?: string;
  showRibbon?: boolean;
}

/**
 * Wraps premium content with a subtle animated gold border when the
 * current user is an Inner Circle (active subscription) member.
 * Non-members see the children unchanged.
 */
export function InnerCircleFrame({ children, className, showRibbon = true }: InnerCircleFrameProps) {
  const { isActive } = useSubscription();

  if (!isActive) return <>{children}</>;

  return (
    <div className={cn("inner-circle-frame", className)}>
      {showRibbon && (
        <div className="absolute -top-2.5 left-4 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur border border-gold/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold shadow-[0_2px_10px_-2px_hsl(var(--gold)/0.4)]">
            <Crown className="w-3 h-3" />
            Inner Circle
          </span>
        </div>
      )}
      <div className="rounded-[calc(0.95rem-1.5px)] bg-background relative">
        {children}
      </div>
    </div>
  );
}
