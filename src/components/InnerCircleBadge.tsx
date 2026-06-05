import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface InnerCircleBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Subtle gold "Inner Circle" pill. Earned, not loud.
 */
export function InnerCircleBadge({ className, size = "sm" }: InnerCircleBadgeProps) {
  const isMd = size === "md";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase",
        "bg-gradient-to-r from-gold/15 via-gold/10 to-gold/15",
        "border border-gold/30 text-gold",
        "shadow-[inset_0_0_0_1px_hsl(var(--gold)/0.08)]",
        isMd ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]",
        className
      )}
    >
      <Crown className={cn(isMd ? "w-3.5 h-3.5" : "w-3 h-3", "text-gold")} />
      Inner Circle
    </span>
  );
}
