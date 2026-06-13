import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Sparkles } from 'lucide-react';

export function WorldCupTeaser() {
  return (
    <Link
      to="/world-cup"
      className="group relative block overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-r from-navy-dark via-primary/10 to-navy-dark px-4 py-3 md:px-5 md:py-4 transition-transform hover:-translate-y-0.5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background:radial-gradient(circle_at_15%_50%,hsl(var(--gold)/0.25),transparent_55%),radial-gradient(circle_at_85%_50%,hsl(var(--primary)/0.25),transparent_55%)]" />
      <div className="relative flex items-center gap-3 md:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold via-gold-glow to-gold-dark shadow-md shadow-gold/30">
          <Trophy className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gold">
            <Sparkles className="h-3 w-3" /> World Cup 2026 Hub
          </div>
          <p className="text-sm md:text-base font-semibold text-foreground truncate">
            48 team reviews, group previews & the Gaffer's daily tips.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold group-hover:bg-gold/20">
          Enter the hub <ArrowRight className="h-3.5 w-3.5" />
        </span>
        <ArrowRight className="sm:hidden h-4 w-4 text-gold shrink-0" />
      </div>
    </Link>
  );
}
