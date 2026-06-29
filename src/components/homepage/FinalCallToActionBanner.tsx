import { ArrowRight, Check, Crown, Gift, Lock, BadgeCheck } from 'lucide-react';
import { ASSETS, FINAL_CTA_FEATURES } from './content';
import { Icon } from './icons';

const MEMBER_BADGES = [
  { icon: Lock, label: 'Exclusive Access' },
  { icon: Gift, label: 'Monthly Giveaways' },
  { icon: BadgeCheck, label: 'Member Only Content' },
];

/** Final call to action — celebrating Gaffer (distinct image), "Be part of something special." */
export function FinalCallToActionBanner() {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-purple-500/40 bg-gradient-to-br from-[#1a0a33] via-[#150828] to-[#0c0518] shadow-[0_0_80px_-30px_rgba(147,51,234,0.7)]">
      <div className="pointer-events-none absolute inset-0 opacity-50 [background:radial-gradient(circle_at_15%_30%,rgba(168,85,247,0.4),transparent_55%)]" />
      <div className="relative grid gap-6 p-6 md:p-10 lg:grid-cols-[0.9fr_1fr_0.8fr]">
        {/* Left — celebrating Gaffer */}
        <div className="relative hidden overflow-hidden rounded-2xl lg:block">
          <img src={ASSETS.gaffer} alt="The Gaffer celebrating" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 20%' }} loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#150828]" />
        </div>

        {/* Middle — headline + features */}
        <div className="space-y-4 self-center">
          <h2 className="font-display text-5xl leading-[0.9] tracking-tight md:text-6xl">
            <span className="text-white">BE PART OF SOMETHING </span>
            <span className="text-gold">SPECIAL.</span>
          </h2>
          <p className="text-white/75">Join thousands of football fans following The Gaffer every single day.</p>
          <p className="font-hand text-2xl text-white">The Gaffer knows. <span className="text-violet-300">Do you?</span></p>
          <ul className="grid gap-2 pt-1 sm:grid-cols-2">
            {FINAL_CTA_FEATURES.map((f) => (
              <li key={f.title} className="flex items-center gap-2 text-sm text-white/85">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-500/20">
                  <Check className="h-3 w-3 text-violet-300" />
                </span>
                {f.title}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — join box */}
        <div className="flex flex-col justify-center gap-4 rounded-2xl border border-purple-400/30 bg-black/30 p-5">
          <a href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-6 py-4 font-display text-2xl tracking-wide text-[#160a2b] shadow-[0_12px_30px_-12px_hsl(var(--gold))] transition-transform hover:scale-[1.02]">
            JOIN THE CLUB <ArrowRight className="h-6 w-6" />
          </a>
          <div className="grid grid-cols-3 gap-2">
            {MEMBER_BADGES.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-purple-400/20 p-3 text-center">
                <b.icon className="h-5 w-5 text-violet-300" />
                <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-white/70">{b.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-white/60">
            Already a member? <a href="/auth" className="font-bold text-violet-300 hover:text-violet-200">Login</a>
          </p>
          <Crown className="mx-auto h-5 w-5 text-gold/70" />
        </div>
      </div>
    </section>
  );
}
