import { Link } from 'react-router-dom';
import { ArrowRight, Laugh } from 'lucide-react';
import { useDonkey } from './useHomepageData';
import { Icon } from './icons';
import { DONKEY_MOMENTS, DONKEY_PRIZES } from './content';

export function DonkeyOfTheWeekFeatureCard() {
  const { data: donkey } = useDonkey();
  const ctaHref = donkey?.cta_href ?? '/fantasy-league';
  const headline = donkey?.headline ?? 'Donkey of the Week';
  const description =
    donkey?.description ??
    "Every week we crown one legend for the most spectacular fantasy fail. It could be you.";

  return (
    <Link
      id="donkey-of-the-week"
      to={ctaHref}
      className="group relative block overflow-hidden rounded-2xl border border-fuchsia-500/45 bg-gradient-to-br from-[#1a0415] via-[#12040f] to-[#0a0208] p-5 shadow-[0_0_70px_-20px_rgba(217,70,239,0.55)] md:rounded-3xl md:p-7"
    >
      <div className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-fuchsia-500/20 text-fuchsia-200">
          <Laugh className="h-6 w-6" />
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-fuchsia-300">
            Hall of Shame
          </div>
          <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl">
            {headline}
          </h2>
        </div>
      </div>

      <p className="relative mt-3 text-sm text-white/75">{description}</p>

      <div className="relative mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-fuchsia-200/80">
            How you make the list
          </div>
          <ul className="mt-1.5 space-y-1 text-[12px] text-white/75">
            {DONKEY_MOMENTS.slice(0, 4).map((m) => (
              <li key={m} className="flex gap-1.5"><span className="text-fuchsia-300">•</span>{m}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/5 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-fuchsia-200/80">
            Consolation prizes
          </div>
          <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
            {DONKEY_PRIZES.map((p) => (
              <li key={p.label} className="flex items-center gap-1.5 text-[11px] text-white/80">
                <Icon name={p.icon} className="h-3.5 w-3.5 text-fuchsia-300" />
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-fuchsia-300 transition-transform group-hover:translate-x-0.5">
        {donkey?.cta_label ?? 'See This Week\'s Donkey'} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
