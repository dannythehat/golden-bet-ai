import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { ValueBoardHero } from '@/components/valueboard/ValueBoardHero';
import { GafferDailyCardSection } from '@/components/valueboard/GafferDailyCardSection';
import { MarketBoard } from '@/components/valueboard/MarketBoard';
import { EmailAlertPreferences } from '@/components/valueboard/EmailAlertPreferences';
import { SEOValueExplainer, ResponsibleFooterNote } from '@/components/valueboard/SEOValueExplainer';
import { useValueHubSummary, useGafferDailyCard, useSubscriberState, useValueBoardRealtime } from '@/hooks/useValueBoard';
import type { ValueMarketKey } from '@/lib/valueBoard';

const SEO_TITLE = "The Gaffer's Value Board | Football Value Bets Today";
const SEO_DESC =
  'Explore today’s football value bets across goals, corners, cards and both teams to score markets. ' +
  'The Gaffer scans the Footy Oracle form tables and surfaces the strongest data-led football match insights for members.';

/** SubscriberLockPanel — access states around the gated board content. */
function SubscriberLockPanel({ state, children }: { state: ReturnType<typeof useSubscriberState>; children: React.ReactNode }) {
  if (state === 'paid') return <>{children}</>;

  if (state === 'preview') {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#f5c542]/35 bg-[#f5c542]/[0.07] px-4 py-3">
          <span className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-wide text-[#f8e7a1]">
            <Sparkles className="h-4 w-4" /> Launch preview — free to explore until 1st August, then members only
          </span>
          <Link to="/#join" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/80 transition-colors hover:text-white">
            Join the club · £8.99/month <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {children}
      </>
    );
  }

  // free / expired: teaser — the real board, blurred, behind an honest lock.
  return (
    <div className="relative overflow-hidden rounded-[1.6rem]">
      <div aria-hidden className="pointer-events-none select-none blur-md [mask-image:linear-gradient(180deg,#000_0%,transparent_92%)]">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[1.4rem] border border-[#f5c542]/35 bg-[#130321]/95 p-6 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#f5c542]/35 bg-[#f5c542]/10 text-[#f5c542]"><Lock className="h-6 w-6" /></span>
          <h3 className="mt-3 font-display text-2xl uppercase tracking-tight text-white">
            {state === 'expired' ? 'Your membership has lapsed' : 'The full board is for members'}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {state === 'expired'
              ? 'Pick up where you left off — the board, the daily card and your email alerts are all waiting.'
              : 'The Gaffer scans every market on every fixture, every morning. Members get the whole board, the daily card, the breakdowns and the alerts.'}
          </p>
          <Link
            to="/#join"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5"
          >
            {state === 'expired' ? 'Regain access' : 'Join The Club'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** ValueBoardPage — the Match Insights Hub: hero → daily card → market board
 *  → alerts → SEO explainer, all inside the subscriber access wrapper. */
export default function ValueBoard() {
  const subscriberState = useSubscriberState();
  const summary = useValueHubSummary();
  const card = useGafferDailyCard();
  useValueBoardRealtime(); // contract seat for value-board-updates (no push channel yet)
  const [pendingMarket, setPendingMarket] = useState<ValueMarketKey | null>(null);

  // SEO title + meta description (restored on unmount).
  useEffect(() => {
    const prevTitle = document.title;
    document.title = SEO_TITLE;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    const prevDesc = meta.content;
    meta.content = SEO_DESC;
    return () => { document.title = prevTitle; if (created) meta!.remove(); else meta!.content = prevDesc; };
  }, []);

  const goToAlerts = (k: ValueMarketKey | null) => {
    setPendingMarket(k);
    document.getElementById('value-alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updatedLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0c0217] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-60 [background:radial-gradient(circle_at_15%_-5%,rgba(88,28,135,0.3),transparent_45%),radial-gradient(circle_at_85%_8%,rgba(245,197,66,0.07),transparent_40%)]" />
      <HomepageNav />

      <main className="relative mx-auto max-w-5xl space-y-4 px-3 pb-14 pt-4 md:space-y-5 md:px-6">
        {!summary.ok || !card.ok ? (
          <div className="rounded-[1.6rem] border border-white/10 bg-[#130321] p-8 text-center text-white/60">
            The board couldn't load its data — refresh to try again.
          </div>
        ) : (
          <>
            <ValueBoardHero updatedLabel={updatedLabel} quietDay={summary.data.quietDay} />
            <SubscriberLockPanel state={subscriberState}>
              <div className="space-y-4 md:space-y-5">
                <GafferDailyCardSection card={card.data} onEmailCard={() => goToAlerts(null)} />
                <MarketBoard summary={summary.data} onAddAlert={(k) => goToAlerts(k)} />
                <EmailAlertPreferences pendingMarket={pendingMarket} onConsumedPending={() => setPendingMarket(null)} />
              </div>
            </SubscriberLockPanel>
            <SEOValueExplainer />
            <ResponsibleFooterNote />
          </>
        )}
      </main>
    </div>
  );
}
