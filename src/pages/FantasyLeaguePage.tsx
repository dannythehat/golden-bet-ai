import { Link } from 'react-router-dom';
import {
  Trophy, Sparkles, ArrowLeft, ArrowRight, Calendar, Gift, Users,
  CalendarDays, Crown, Newspaper, Star,
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';

const theGaffer = '/images/the-gaffer.png';

/**
 * Footy Oracle Fantasy League — PLACEHOLDER landing page (structure + routing
 * only). Copy is intentionally rough; the polished sell + reservation flow are
 * built in a follow-up. Sections mirror the agreed framework.
 */
function Section({
  id, eyebrow, icon: Icon, title, children,
}: {
  id: string; eyebrow: string; icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        <Icon className="h-3.5 w-3.5" /> {eyebrow}
      </span>
      <h2 className="text-2xl md:text-3xl font-black text-foreground">{title}</h2>
      <div className="text-foreground/80 space-y-2 max-w-3xl">{children}</div>
    </section>
  );
}

export default function FantasyLeaguePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16 flex-1 space-y-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/15 to-navy-dark p-6 md:p-12 shadow-xl shadow-gold/10">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_15%,hsl(var(--gold)/0.25),transparent_55%),radial-gradient(circle_at_85%_85%,hsl(var(--primary)/0.3),transparent_55%)]" />
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <img
              src={theGaffer}
              alt="The Gaffer"
              className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover border-2 border-gold/40 shadow-2xl flex-shrink-0"
              style={{ objectPosition: '58% 20%' }}
              width={192}
              height={192}
              fetchPriority="high"
            />
            <div className="text-center md:text-left space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
                <Sparkles className="h-3.5 w-3.5" /> Coming for 2025/26
              </span>
              <h1 className="text-3xl md:text-5xl font-black leading-tight text-foreground">
                The Footy Oracle <span className="text-gold">Fantasy League</span>
              </h1>
              <p className="text-base md:text-lg text-foreground/85 max-w-2xl">
                A football club you'll want to open every day. Run by The Gaffer.
                Daily articles, weekly winners, huge prizes, Christmas specials and
                proper banter. Can you beat The Gaffer?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button asChild variant="gold" size="xl" className="gap-2">
                  <a href="#reserve"><Trophy className="h-4 w-4" /> Reserve Your Place</a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Placeholder page — reservation flow opens soon. Season kicks off in August.
              </p>
            </div>
          </div>
        </section>

        {/* Meet The Gaffer */}
        <Section id="meet-the-gaffer" eyebrow="The Boss" icon={Star} title="Meet The Gaffer">
          <p>
            The Gaffer is the fictional manager who runs the Club. He has his own fantasy
            team, writes daily, celebrates the winners, roasts the howlers, and owns his
            mistakes. <em>Placeholder copy — full backstory to follow.</em>
          </p>
        </Section>

        {/* Why Join */}
        <Section id="why-join" eyebrow="Why Join" icon={Sparkles} title="Why join the Club">
          <ul className="grid sm:grid-cols-2 gap-3">
            {[
              'Daily articles & updates from The Gaffer',
              'Weekly awards and prizes',
              'Real prizes across the season',
              'Christmas Challenge & seasonal specials',
              'A proper community, not just a leaderboard',
              'Full transparency — nothing rewritten',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 rounded-xl border border-border/50 bg-card/50 p-3">
                <ArrowRight className="h-4 w-4 text-gold mt-0.5 shrink-0" /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Weekly Competitions */}
        <Section id="weekly-competitions" eyebrow="Every Week" icon={CalendarDays} title="Weekly competitions">
          <p>
            Manager of the Week, Donkey of the Week, Biggest Climber, Jammy Git and more —
            traditions that build over the season. <em>Placeholder.</em>
          </p>
        </Section>

        {/* Main Season Prizes */}
        <Section id="season-prizes" eyebrow="The Big One" icon={Trophy} title="Main season prizes">
          <p>
            End-of-season prizes for the Club's best. Prize details and sponsors to be
            announced. <em>Placeholder.</em>
          </p>
        </Section>

        {/* Christmas Challenge */}
        <Section id="christmas-challenge" eyebrow="Festive Special" icon={Gift} title="The Christmas Challenge">
          <p>
            A special mid-season event with its own champion. <em>Placeholder.</em>
          </p>
        </Section>

        {/* Community */}
        <Section id="community" eyebrow="The Lads" icon={Users} title="Community & banter">
          <p>
            Daily discussion, Facebook interaction, rivalries and running jokes. The Gaffer
            notices everything. <em>Placeholder.</em>
          </p>
        </Section>

        {/* Daily Gaffer Articles */}
        <Section id="daily-articles" eyebrow="Every Morning" icon={Newspaper} title="Daily Gaffer articles">
          <p>
            Wake up wanting to know what The Gaffer has said this morning. <em>Placeholder.</em>
          </p>
        </Section>

        {/* Reserve Your Place */}
        <section id="reserve" className="scroll-mt-28 relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/15 to-navy-dark p-6 md:p-10 text-center shadow-xl shadow-gold/10">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.25),transparent_60%)]" />
          <div className="relative space-y-4 max-w-2xl mx-auto">
            <Crown className="h-10 w-10 text-gold mx-auto" />
            <h2 className="text-2xl md:text-4xl font-black text-foreground">Reserve your place</h2>
            <p className="text-foreground/85">
              Be first in when the Footy Oracle Fantasy League opens for the new season.
              The reservation form lands here shortly.
            </p>
            <Button variant="gold" size="xl" className="gap-2" disabled>
              <Trophy className="h-4 w-4" /> Reservations opening soon
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
