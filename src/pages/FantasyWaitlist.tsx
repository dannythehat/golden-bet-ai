import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Palmtree, MessagesSquare, Crown, Check, Mail, ShieldCheck,
  Sparkles, Users, Shirt, Wallet, ChevronUp, ChevronDown, ArrowRight, Flame,
} from 'lucide-react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';

// Bright FPL-style band gradient.
const BAND = 'bg-[linear-gradient(120deg,#22d3ee_0%,#3b82f6_38%,#8b5cf6_72%,#d946ef_100%)]';

function WaitlistForm({ source, tone = 'gold' }: { source: string; tone?: 'gold' | 'light' }) {
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'loading') return;
    setState('loading'); setMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, hp, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) { setState('done'); setMsg(data.already ? "You're already on the list — nice one." : "You're in. We'll shout the moment it kicks off."); }
      else { setState('error'); setMsg(data.error === 'invalid_email' ? 'That email looks off — try again.' : 'Something went wrong. Try again in a sec.'); }
    } catch { setState('error'); setMsg('Network hiccup — try again in a sec.'); }
  }

  if (state === 'done') {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl border border-emerald-400/45 bg-emerald-500/15 px-5 py-3.5 text-sm font-bold text-emerald-200">
        <Check className="h-4 w-4" /> {msg}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md">
      <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Mail className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${tone === 'light' ? 'text-[#16051f]/40' : 'text-white/40'}`} />
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            className={`h-12 w-full rounded-xl pl-10 pr-3 text-[15px] outline-none transition-colors ${tone === 'light'
              ? 'border border-black/10 bg-white text-[#16051f] placeholder:text-[#16051f]/40 focus:border-violet-500'
              : 'border border-white/15 bg-[#07000f]/80 text-white placeholder:text-white/35 focus:border-[#f5c542]/60'}`}
          />
        </div>
        <button type="submit" disabled={state === 'loading'}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5 disabled:opacity-70">
          {state === 'loading' ? 'Adding…' : 'Join the Waitlist'}
        </button>
      </div>
      {state === 'error' && <p className={`mt-2 text-center text-xs ${tone === 'light' ? 'text-rose-700' : 'text-rose-300'}`}>{msg}</p>}
      <p className={`mt-2.5 flex items-center justify-center gap-1.5 text-[11px] ${tone === 'light' ? 'text-[#16051f]/55' : 'text-white/45'}`}>
        <ShieldCheck className="h-3.5 w-3.5" /> Free to play. No payment, no spam — just your spot saved.
      </p>
    </form>
  );
}

// ── Section 1 visual: jersey pick cards (Pick Your Squad) ───────────────────
function JerseyCard({ name, team, colour, tilt }: { name: string; team: string; colour: string; tilt: string }) {
  return (
    <div className={`relative w-[42%] max-w-[170px] rounded-2xl bg-[#0d3b2e] p-3 shadow-[0_18px_30px_-14px_rgba(0,0,0,0.6)] ${tilt}`}>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-xl" style={{ background: colour }}>
        <Shirt className="h-11 w-11 text-white drop-shadow" />
      </div>
      <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-center shadow">
        <div className="truncate font-display text-[15px] uppercase leading-none tracking-tight text-[#2d0a4e]">{name}</div>
        <div className="text-[10px] font-bold text-[#2d0a4e]/60">{team}</div>
      </div>
    </div>
  );
}

// ── Section visual: a leaderboard row (Compete) ─────────────────────────────
function LeaderRow({ pos, up, team, manager, gw, total, lead }: { pos: number; up: boolean; team: string; manager: string; gw: number; total: number; lead?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)] ${lead ? 'bg-white' : 'bg-white/85'}`}>
      <span className="w-5 text-center font-display text-lg text-[#2d0a4e]">{pos}</span>
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${up ? 'bg-emerald-500' : 'bg-rose-500'}`}>
        {up ? <ChevronUp className="h-4 w-4 text-white" /> : <ChevronDown className="h-4 w-4 text-white" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[17px] uppercase leading-none tracking-tight text-[#2d0a4e]">{team}</div>
        <div className="truncate text-[12px] text-[#2d0a4e]/60">{manager}</div>
      </div>
      <span className="w-8 text-right font-bold text-[#2d0a4e]/70">{gw}</span>
      <span className="w-12 text-right font-display text-lg text-[#2d0a4e]">{total}</span>
    </div>
  );
}

function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      {eyebrow && <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">{eyebrow}</div>}
      <h2 className="font-display text-3xl uppercase leading-[0.95] tracking-tight text-white md:text-4xl">{title}</h2>
      <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65">{children}</div>
    </div>
  );
}

export default function FantasyWaitlist() {
  return (
    <div className="min-h-screen bg-[#0a0613] text-white">
      <HomepageNav />

      <div className="mx-auto max-w-3xl px-3 pt-3 md:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-[#f5c542]">
          <ArrowLeft className="h-4 w-4" /> Back to the club
        </Link>
      </div>

      <main className="mx-auto mt-3 max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a0613] md:mx-auto md:max-w-3xl">
        {/* ── HERO band ── */}
        <section className={`relative ${BAND} overflow-hidden px-5 py-9 text-center md:py-12`}>
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Coming Soon
          </span>
          <h1 className="mt-3 font-display text-5xl uppercase leading-[0.85] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.3)] md:text-7xl">
            Fantasy<br /><span className="text-[#f8e7a1]">Football</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] font-semibold text-white/90 md:text-base">
            Pick your squad. Rack up points every gameweek. Win real prizes — and beat The Gaffer.
          </p>
        </section>

        {/* ── Register / waitlist block (dark, like FPL's register panel) ── */}
        <section className="border-b border-white/10 bg-[#130321] px-5 py-8 text-center md:px-8 md:py-10">
          <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">Register to play the Footy Oracle Fantasy League</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
            Powered by the official Premier League game — <b className="text-white">free to play</b>, real players, real points, and prizes you'll
            actually want. It's not live yet: get on the waitlist and you're first through the door.
          </p>
          <div className="mt-6"><WaitlistForm source="fantasy-hero" /></div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/40"><Users className="h-3.5 w-3.5" /> Founding members get in before anyone else.</p>
        </section>

        {/* ── PICK YOUR SQUAD ── */}
        <SectionHead eyebrow="01 · Your Team" title="Pick your squad">
          Use your <b className="text-white">£100m budget</b> to pick a squad of <b className="text-white">15 players</b> from the Premier League.
          Captain your talisman, bench your dead weight, and out-think everyone.
        </SectionHead>
        <div className={`relative ${BAND} flex items-center justify-center gap-3 overflow-hidden px-4 py-10`}>
          <JerseyCard name="Saka" team="ARS (H)" colour="#ef2b2d" tilt="-rotate-6" />
          <div className="z-10 -mx-4 grid place-items-center rounded-2xl bg-[#0d3b2e] px-4 py-6 text-center text-white shadow-[0_18px_30px_-14px_rgba(0,0,0,0.6)]">
            <Users className="h-6 w-6" />
            <span className="mt-1 font-display text-sm uppercase tracking-tight">Midfield</span>
          </div>
          <JerseyCard name="Palmer" team="CHE (A)" colour="#1e63d0" tilt="rotate-6" />
        </div>

        {/* ── HOW YOU WIN / prizes ── */}
        <SectionHead eyebrow="02 · The Prizes" title="Play for prizes that matter">
          This isn't bragging rights and a spreadsheet. Every week there's something real on the line — and one season-long grand prize worth chasing.
        </SectionHead>
        <div className="grid gap-3 px-5 pb-8 sm:grid-cols-2 md:px-8">
          {[
            { Icon: Trophy, t: 'Weekly prizes', b: 'Top the gameweek, bank a reward. Fresh shot every week.' },
            { Icon: Palmtree, t: 'Dream-holiday grand prize', b: 'Win the season and win a getaway — the big one.', gold: true },
            { Icon: MessagesSquare, t: 'Loads of banter', b: 'Rivalries, trash talk and glory across the community.' },
            { Icon: Crown, t: 'Founding-member status', b: "First in when it opens — you helped start it." },
          ].map(({ Icon, t, b, gold }) => (
            <div key={t} className={`frost-3d rounded-2xl p-4 ${gold ? 'ring-1 ring-inset ring-[#f5c542]/40' : ''}`}>
              <div className={`mb-2 grid h-10 w-10 place-items-center rounded-xl border ${gold ? 'border-[#f5c542]/45 bg-[#f5c542]/15 text-[#f5c542]' : 'border-violet-400/40 bg-violet-500/15 text-violet-200'}`}><Icon className="h-5 w-5" /></div>
              <div className="font-display text-lg uppercase tracking-tight text-white">{t}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-white/60">{b}</p>
            </div>
          ))}
        </div>

        {/* ── CREATE & JOIN LEAGUES — leaderboard mockup ── */}
        <SectionHead eyebrow="03 · The League" title="Create & join leagues">
          Play against friends, family, colleagues — or the whole Footy Oracle community — in invitational leagues and cups.
          Live standings, updated every gameweek.
        </SectionHead>
        <div className={`relative ${BAND} px-4 py-9`}>
          <div className="mx-auto max-w-sm rounded-2xl bg-white p-3 shadow-[0_26px_50px_-20px_rgba(0,0,0,0.6)]">
            <div className="mb-2 text-center font-display text-base uppercase tracking-tight text-[#2d0a4e]">Footy Oracle Fantasy League</div>
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-[#f1eef6] p-1 text-center text-[12px] font-bold">
              <span className="rounded-lg bg-white py-1.5 text-[#2d0a4e] shadow-sm">League</span>
              <span className="py-1.5 text-[#2d0a4e]/50">Cup</span>
            </div>
            <div className="grid grid-cols-[28px_1fr_36px_44px] gap-2 border-b border-black/10 px-1 pb-1 text-[10px] font-black uppercase tracking-wide text-[#2d0a4e]/45">
              <span>Pos</span><span>Team</span><span className="text-right">GW</span><span className="text-right">Total</span>
            </div>
            {[
              { p: 1, up: true, t: 'Seeing Reds', m: 'You', gw: 84, tot: 683 },
              { p: 2, up: false, t: 'The Gaffer XI', m: 'The Gaffer', gw: 71, tot: 678 },
              { p: 3, up: true, t: 'Game of Throw-ins', m: 'A. Smith', gw: 78, tot: 676 },
            ].map((r) => (
              <div key={r.p} className="grid grid-cols-[28px_1fr_36px_44px] items-center gap-2 border-b border-black/5 px-1 py-2 last:border-0">
                <span className="flex items-center gap-1 text-[#2d0a4e]"><span className={`h-2 w-2 rounded-full ${r.up ? 'bg-emerald-500' : 'bg-rose-500'}`} />{r.p}</span>
                <div className="min-w-0"><div className="truncate text-[13px] font-bold text-[#2d0a4e]">{r.t}</div><div className="truncate text-[10px] text-[#2d0a4e]/55">{r.m}</div></div>
                <span className="text-right text-[13px] text-[#2d0a4e]/70">{r.gw}</span>
                <span className="text-right font-display text-[15px] text-[#2d0a4e]">{r.tot}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMPETE AGAINST THE GAFFER ── */}
        <SectionHead eyebrow="04 · The Rivalry" title="Beat The Gaffer">
          He picks a team too — and he's cocky about it. Finish above The Gaffer and you'll never let him hear the end of it.
        </SectionHead>
        <div className={`relative ${BAND} space-y-2.5 px-4 py-9`}>
          <div className="mx-auto max-w-sm space-y-2.5">
            <LeaderRow pos={1} up team="Alisson Wonderland" manager="You, hopefully" gw={92} total={680} lead />
            <div className="pl-4"><LeaderRow pos={2} up={false} team="The Gaffer XI" manager="The Gaffer 😤" gw={76} total={675} /></div>
          </div>
        </div>

        {/* ── FINAL CTA ── */}
        <section className="bg-[#130321] px-5 py-10 text-center md:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
            <Flame className="h-3.5 w-3.5" /> Be first in
          </span>
          <h2 className="mt-3 font-display text-4xl uppercase leading-none tracking-tight text-white md:text-5xl">Save your spot</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/60">Drop your email and you're on the list. We'll only email you when it's ready to play.</p>
          <div className="mt-6"><WaitlistForm source="fantasy-footer" /></div>
        </section>
      </main>

      <div className="mx-auto mt-8 max-w-3xl px-3 pb-12 md:px-6"><FooterNavigation /></div>
    </div>
  );
}
