import { Facebook, Send, ArrowRight, Users } from 'lucide-react';
import { SOCIAL_LINKS, COMMUNITY_CARDS } from './content';

const NETWORKS = {
  facebook: { Icon: Facebook, color: 'bg-[#1877f2]', ring: 'border-[#1877f2]/50' },
  telegram: { Icon: Send, color: 'bg-[#229ed9]', ring: 'border-[#229ed9]/50' },
} as const;

export function CommunityFeatureCard() {
  return (
    <section
      id="community"
      className="rounded-2xl border border-cyan-400/45 bg-gradient-to-br from-[#03131b] via-[#02101a] to-[#01080f] p-5 shadow-[0_0_60px_-18px_rgba(34,211,238,0.5)] md:rounded-3xl md:p-7"
    >
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-cyan-300" />
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
          Community
        </span>
      </div>
      <h2 className="mt-2 font-display text-3xl leading-tight text-white sm:text-4xl">
        Join the <span className="text-cyan-300">banter</span>.
      </h2>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {COMMUNITY_CARDS.map((c) => {
          const N = NETWORKS[c.network];
          const href = SOCIAL_LINKS[c.network];
          return (
            <a
              key={c.network}
              href={href}
              className={`group block rounded-xl border ${N.ring} bg-white/[0.02] p-4 transition-all hover:-translate-y-0.5 hover:bg-white/[0.05]`}
            >
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full ${N.color} text-white`}>
                  <N.Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-white/60">
                    {c.name}
                  </div>
                  <div className="text-sm font-bold text-white">{c.heading}</div>
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-1 text-[11px] text-white/70">
                {c.points.slice(0, 6).map((p) => (
                  <li key={p} className="flex gap-1"><span className="text-cyan-300">•</span>{p}</li>
                ))}
              </ul>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-cyan-300">
                {c.cta} <ArrowRight className="h-3 w-3" />
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
