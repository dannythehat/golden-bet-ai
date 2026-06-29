import { Link } from 'react-router-dom';
import { Trophy, Sparkles, ArrowRight, Calendar, Gift, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const theGaffer = '/images/the-gaffer.png';

/**
 * Premium pre-season call-to-action introducing the Footy Oracle Fantasy League.
 * Designed to be impossible to miss without feeling spammy. Links to the
 * /fantasy-league landing page (the detailed sell + reservation flow live there).
 */
export function FantasyLeagueBanner() {
  return (
    <section
      aria-label="Footy Oracle Fantasy League — coming soon"
      className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/15 to-navy-dark shadow-xl shadow-gold/10"
    >
      {/* Premium glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_12%_20%,hsl(var(--gold)/0.25),transparent_55%),radial-gradient(circle_at_88%_80%,hsl(var(--primary)/0.3),transparent_55%)]" />

      <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">
        {/* The Gaffer */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-gold/20 blur-2xl rounded-full" />
          <img
            src={theGaffer}
            alt="The Gaffer"
            className="relative w-28 h-28 md:w-40 md:h-40 rounded-2xl object-cover border-2 border-gold/40 shadow-2xl"
            style={{ objectPosition: '58% 20%' }}
            width={160}
            height={160}
            loading="lazy"
          />
          <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-glow text-primary-foreground text-[11px] font-bold shadow-lg">
            <Trophy className="w-3 h-3 inline mr-1" />Pre-season
          </div>
        </div>

        {/* Copy + CTAs */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
            <Sparkles className="h-3.5 w-3.5" /> New for 2025/26
          </span>

          <h2 className="text-2xl md:text-4xl font-black leading-tight text-foreground">
            The Footy Oracle <span className="text-gold">Fantasy League</span> is coming ⚽
          </h2>

          <p className="text-base md:text-lg text-foreground/85 max-w-2xl">
            Join The Gaffer this season — daily updates, weekly winners, huge prizes,
            Christmas specials and proper football banter.
            <span className="font-semibold text-foreground"> Can you beat The Gaffer?</span>
          </p>

          {/* Quick feature pills */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {[
              { icon: Calendar, label: 'Daily Gaffer articles' },
              { icon: Gift, label: 'Weekly prizes' },
              { icon: Trophy, label: 'Christmas Challenge' },
              { icon: Users, label: 'Community' },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1 text-xs font-medium text-foreground/80"
              >
                <Icon className="h-3.5 w-3.5 text-gold" /> {label}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-1">
            <Button asChild variant="gold" size="xl" className="gap-2">
              <Link to="/fantasy-league">
                <Trophy className="h-4 w-4" /> Reserve Your Place
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="gap-2 border-gold/40 text-gold hover:bg-gold/10 hover:text-gold">
              <Link to="/fantasy-league">
                Read More <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
