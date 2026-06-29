import { ArrowRight, Check, Facebook, Send, Users } from 'lucide-react';
import { SectionShell } from './primitives';
import { COMMUNITY_CARDS, COMMUNITY_STRIP, SOCIAL_LINKS } from './content';

const NETWORK = {
  facebook: { Icon: Facebook, href: SOCIAL_LINKS.facebook, btn: 'from-[#1877F2] to-[#0d5fd0]', tint: 'text-[#5b9bff]', ring: 'border-[#1877F2]/40' },
  telegram: { Icon: Send, href: SOCIAL_LINKS.telegram, btn: 'from-[#229ED9] to-[#1787bd]', tint: 'text-[#5cc8f5]', ring: 'border-[#229ED9]/40' },
} as const;

/** Join Our Community — cyan glow, Facebook + Telegram cards, info strip. */
export function CommunityFeatureCard() {
  return (
    <SectionShell
      id="community"
      glow={{ border: 'rgba(34,211,238,0.45)', glow: 'rgba(6,182,212,0.5)' }}
      className="bg-gradient-to-br from-[#031a22] via-[#04141d] to-[#020c12] p-5 md:p-8"
    >
      <div className="mb-6 text-center">
        <h2 className="font-display text-3xl tracking-wide text-white md:text-4xl">JOIN OUR COMMUNITY</h2>
        <p className="mx-auto mt-1 max-w-2xl text-white/65">
          The Gaffer never sleeps. Join thousands of football fans for daily banter, tips, league updates and exclusive competitions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {COMMUNITY_CARDS.map((c) => {
          const net = NETWORK[c.network];
          return (
            <div key={c.network} className={`rounded-2xl border ${net.ring} bg-white/[0.03] p-6`}>
              <div className="mb-4 flex items-center gap-3">
                <net.Icon className={`h-8 w-8 ${net.tint}`} />
                <h3 className="font-display text-2xl tracking-wide text-white">{c.name}</h3>
              </div>
              <p className="mb-3 font-semibold text-white/85">{c.heading}</p>
              <ul className="mb-5 grid gap-2 sm:grid-cols-2">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-white/75">
                    <Check className="h-4 w-4 shrink-0 text-cyan-400" /> {p}
                  </li>
                ))}
              </ul>
              <a href={net.href} className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${net.btn} px-6 py-3 font-display tracking-wide text-white transition-transform hover:scale-[1.01]`}>
                {c.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          );
        })}
      </div>

      {/* Info strip */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-cyan-400/15 bg-cyan-950/20 px-4 py-3 text-sm font-semibold text-white/70">
        <Users className="h-4 w-4 text-cyan-400" />
        {COMMUNITY_STRIP.map((s, i) => (
          <span key={s} className="flex items-center gap-3">
            {i > 0 && <span className="text-cyan-400/50">·</span>}
            {s}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}
