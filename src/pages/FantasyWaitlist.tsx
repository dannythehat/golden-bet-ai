import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy, Palmtree, MessagesSquare, Crown, Check, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';

const REASONS = [
  { Icon: Trophy, title: 'Weekly cash-free prizes', body: 'Top the leaderboard each week and bank real rewards — every gameweek is a fresh shot at glory.' },
  { Icon: Palmtree, title: 'A dream-holiday grand prize', body: "Win the season and you're not getting a mug — you're getting a getaway. The big one.", accent: true },
  { Icon: MessagesSquare, title: 'Beat the Gaffer', body: "He picks a team too. Finish above him and you'll never let him hear the end of it. Loads of banter, rivalries, trash talk." },
  { Icon: Crown, title: 'Founding-member status', body: "Everyone on this list is first through the door when it opens — you helped start it." },
];

const STEPS = [
  'Pick your squad on a budget — brains over bank balance.',
  'Rack up points every gameweek across the season.',
  'Climb the league, win weekly prizes, chase the grand prize.',
];

function WaitlistForm({ source, compact = false }: { source: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading'); setMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name, hp, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { setState('done'); setMsg(data.already ? "You're already on the list — nice one." : "You're in. We'll shout when it kicks off."); }
      else { setState('error'); setMsg(data.error === 'invalid_email' ? 'That email looks off — give it another go.' : 'Something went wrong. Try again in a sec.'); }
    } catch { setState('error'); setMsg('Network hiccup — try again in a sec.'); }
  }

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-center">
        <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-emerald-500/20 text-emerald-300"><Check className="h-6 w-6" /></div>
        <div className="font-display text-xl uppercase tracking-tight text-emerald-200">On the list!</div>
        <p className="mt-1 text-sm text-white/70">{msg}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? '' : 'rounded-2xl border border-[#f5c542]/25 bg-black/30 p-4 md:p-5'}>
      {/* honeypot — hidden from humans */}
      <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="h-12 w-full rounded-xl border border-white/15 bg-[#07000f]/80 pl-10 pr-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#f5c542]/60"
          />
        </div>
        <button
          type="submit" disabled={state === 'loading'}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5 disabled:opacity-70"
        >
          {state === 'loading' ? 'Adding…' : 'Join the Waitlist'}
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-center text-xs text-rose-300 sm:text-left">{msg}</p>}
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-white/45 sm:justify-start">
        <ShieldCheck className="h-3.5 w-3.5" /> No payment, no spam. Just your spot saved for when it launches.
      </p>
    </form>
  );
}

export default function FantasyWaitlist() {
  return (
    <div className="min-h-screen bg-[#07000f] text-white">
      <HomepageNav />

      <main className="mx-auto max-w-3xl px-3 pb-16 pt-4 md:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-[#f5c542]">
          <ArrowLeft className="h-4 w-4" /> Back to the club
        </Link>

        {/* Hero */}
        <section className="mt-4 overflow-hidden rounded-[1.4rem] border border-[#f5c542]/30 bg-[#130321] shadow-[0_22px_70px_-32px_rgba(245,197,66,0.6)] md:rounded-[1.9rem]">
          <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
          <div className="p-5 md:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
              <Sparkles className="h-3.5 w-3.5" /> Coming Soon
            </span>
            <h1 className="mt-3 font-display text-4xl uppercase leading-[0.92] tracking-tight text-white md:text-6xl">
              The Footy Oracle<br /><span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-[#f5c542] bg-clip-text text-transparent">Fantasy League</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-base">
              A season-long fantasy league with real prizes, a dream-holiday grand prize, and the whole club scrapping it out —
              plus the chance to beat The Gaffer at his own game. It's not live yet. Get on the waitlist and you're first in.
            </p>

            <div className="mt-6"><WaitlistForm source="waitlist-hero" /></div>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/40">
              <Users className="h-3.5 w-3.5" /> Founding members get in before anyone else.
            </p>
          </div>
        </section>

        {/* Why join */}
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl uppercase tracking-tight text-white md:text-2xl">Why you'll want in</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {REASONS.map(({ Icon, title, body, accent }) => (
              <div key={title} className={`card-3d rounded-2xl p-4 ${accent ? 'ring-1 ring-inset ring-[#f5c542]/30' : ''}`}>
                <div className={`mb-2 grid h-10 w-10 place-items-center rounded-xl border ${accent ? 'border-[#f5c542]/45 bg-[#f5c542]/15 text-[#f5c542]' : 'border-violet-400/40 bg-violet-500/15 text-violet-200'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display text-lg uppercase tracking-tight text-white">{title}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
          <h2 className="mb-3 font-display text-xl uppercase tracking-tight text-white md:text-2xl">How the season works</h2>
          <ol className="space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f5c542] text-[13px] font-black text-[#16051f]">{i + 1}</span>
                <span className="pt-0.5 text-[14px] leading-relaxed text-white/80">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Final capture */}
        <section className="mt-6 overflow-hidden rounded-[1.4rem] border border-[#f5c542]/30 bg-gradient-to-br from-[#1a0730] to-[#0a0613] p-5 text-center md:p-8">
          <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">Save your spot</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">Drop your email and you're on the list. We'll only email you when it's ready to play.</p>
          <div className="mx-auto mt-5 max-w-lg"><WaitlistForm source="waitlist-footer" compact /></div>
        </section>

        <div className="mt-10"><FooterNavigation /></div>
      </main>
    </div>
  );
}
