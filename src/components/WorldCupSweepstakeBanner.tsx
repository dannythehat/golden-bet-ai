import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Ticket, Sparkles, ArrowRight, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TOTAL_SPOTS = 48;

export function WorldCupSweepstakeBanner() {
  const [spotsLeft, setSpotsLeft] = useState<number>(22);

  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase
          .from('sweepstake_signups')
          .select('id', { count: 'exact', head: true })
          .eq('tournament', 'wc2026');
        if (typeof count === 'number') {
          setSpotsLeft(Math.max(0, TOTAL_SPOTS - count));
        }
      } catch { /* ignore */ }
    })();
  }, []);

  return (
    <Link
      to="/sweepstake"
      className="group relative block overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/15 to-navy-dark shadow-xl shadow-gold/10 transition-transform hover:-translate-y-0.5"
    >
      {/* Decorative shimmer */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,hsl(var(--gold)/0.25),transparent_60%),radial-gradient(circle_at_80%_80%,hsl(var(--primary)/0.25),transparent_55%)]" />
      <div className="pointer-events-none absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:p-7">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold via-gold-glow to-gold-dark shadow-lg shadow-gold/30">
          <Trophy className="h-8 w-8 text-primary-foreground" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3 w-3" /> Brand New
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ice">
              World Cup 2026
            </span>
            {spotsLeft === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300 animate-pulse">
                <Flame className="h-3 w-3" /> SOLD OUT — All 48 taken
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300 animate-pulse">
                <Flame className="h-3 w-3" /> Only {spotsLeft} spots left
              </span>
            )}
          </div>

          <h2 className="text-xl md:text-2xl font-black leading-tight text-foreground">
            The Gaffer's World Cup Sweepstake — <span className="text-gold">€10 a team</span>, 48 spots, big prizes.
          </h2>

          <p className="text-sm text-foreground/80 max-w-2xl">
            Grab a random nation from the hat. If they go the distance, you cash in.
            <span className="font-semibold text-foreground"> £200 winner · £100 runner-up · £50 third · £30 fourth · £100 Goal of the Tournament.</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Ticket className="h-3.5 w-3.5 text-gold" />
            <span>First 48 sign-ups get a team. Ticket sales open <span className="font-semibold text-foreground">tomorrow</span>.</span>
          </div>
        </div>

        <div className="flex items-center justify-end md:flex-col md:items-end gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-gold/30 transition-transform group-hover:scale-[1.03]">
            Reserve my spot <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
