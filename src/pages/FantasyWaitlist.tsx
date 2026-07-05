import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Palmtree, Check, Mail, ShieldCheck,
  Sparkles, Users, Shirt, Ticket, Gift, Flame, Crown,
} from 'lucide-react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';

// FPL-style vibrant band.
const BAND = 'bg-[linear-gradient(120deg,#22d3ee_0%,#3b82f6_38%,#8b5cf6_72%,#d946ef_100%)]';

/* ── waitlist capture ──────────────────────────────────────────────────────── */
function WaitlistForm({ source }: { source: string }) {
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState('');
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
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            className="h-12 w-full rounded-xl border border-white/15 bg-[#07000f]/80 pl-10 pr-3 text-[15px] text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#f5c542]/60"
          />
        </div>
        <button type="submit" disabled={state === 'loading'}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5 disabled:opacity-70">
          {state === 'loading' ? 'Adding…' : 'Join the Waitlist'}
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-center text-xs text-rose-300">{msg}</p>}
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-white/45">
        <ShieldCheck className="h-3.5 w-3.5" /> Free to play. No payment, no spam — just your spot saved.
      </p>
    </form>
  );
}

/* ── section header (dark copy blocks between bands) ───────────────────────── */
function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">{eyebrow}</div>
      <h2 className="font-display text-3xl uppercase leading-[0.95] tracking-tight text-white md:text-4xl">{title}</h2>
      <div className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/65">{children}</div>
    </div>
  );
}

/* ── jersey pick cards (Pick Your Squad band) ──────────────────────────────── */
function JerseyCard({ name, team, colour, tilt }: { name: string; team: string; colour: string; tilt: string }) {
  return (
    <div className={`relative w-[42%] max-w-[170px] rounded-2xl bg-[#0d3b2e] p-3 shadow-[0_3px_5px_-1px_rgba(0,0,0,0.6),0_22px_38px_-16px_rgba(0,0,0,0.9)] ${tilt}`}>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-xl shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]" style={{ background: colour }}>
        <Shirt className="h-11 w-11 text-white drop-shadow" />
      </div>
      <div className="mt-2 rounded-lg bg-white px-2 py-1.5 text-center shadow">
        <div className="truncate font-display text-[15px] uppercase leading-none tracking-tight text-[#2d0a4e]">{name}</div>
        <div className="text-[10px] font-bold text-[#2d0a4e]/60">{team}</div>
      </div>
    </div>
  );
}

/* ── prize image card ──────────────────────────────────────────────────────── */
function PrizeCard({ img, tag, title, body, big = false, Icon }: {
  img: string; tag: string; title: string; body: string; big?: boolean; Icon: typeof Trophy;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-white/[0.16] shadow-[0_3px_5px_-1px_rgba(0,0,0,0.75),0_22px_38px_-16px_rgba(0,0,0,0.98)] ${big ? 'sm:col-span-2' : ''}`}>
      <div className={`relative overflow-hidden ${big ? 'h-52 md:h-64' : 'h-36 md:h-40'}`}>
        <img src={img} alt={title} loading="lazy" draggable={false}
          className="h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0c0518] via-transparent to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#f8e7a1] backdrop-blur-sm">
          <Icon className="h-3 w-3" /> {tag}
        </span>
      </div>
      <div className="border-t border-white/10 bg-[#140b28] p-3.5">
        <div className="font-display text-lg uppercase leading-none tracking-tight text-white">{title}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">{body}</p>
      </div>
      {/* sharp bevel */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1.5px_0_rgba(255,255,255,0.35),inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
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

      <main className="mx-auto mt-3 max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0a0613]">

        {/* ═══ HERO — the Gaffer celebrating over the FPL band ═══ */}
        <section className={`relative ${BAND} overflow-hidden`}>
          <div aria-hidden className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-white/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 right-1/3 h-44 w-44 rounded-full bg-fuchsia-300/30 blur-3xl" />

          <div className="relative flex items-end">
            {/* copy — left */}
            <div className="min-w-0 flex-1 px-5 pb-8 pt-8 md:px-8 md:pb-12 md:pt-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                <Sparkles className="h-3 w-3" /> Coming Soon
              </span>
              <h1 className="mt-3 font-display text-[44px] uppercase leading-[0.84] tracking-tight text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:text-6xl md:text-7xl">
                Fantasy<br /><span className="text-[#f8e7a1]">Football</span>
              </h1>
              <p className="mt-3 max-w-[16rem] text-[13.5px] font-semibold leading-snug text-white/95 sm:max-w-sm sm:text-[15px]">
                Pick your squad. Rack up points every gameweek. Win real prizes — and beat The Gaffer.
              </p>
            </div>
            {/* the Gaffer, celebrating, standing on the band like FPL's players */}
            <img
              src="/images/gaffer/opt/gaffer-celebrating.webp"
              alt="The Gaffer celebrating"
              loading="eager"
              draggable={false}
              className="pointer-events-none -mb-1 w-[38%] max-w-[300px] shrink-0 select-none self-end drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)] md:w-[34%]"
            />
          </div>
        </section>

        {/* ═══ Register / waitlist ═══ */}
        <section className="border-b border-white/10 bg-[#130321] px-5 py-8 text-center md:px-8 md:py-10">
          <h2 className="font-display text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">
            Register to play the Footy Oracle Fantasy League
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
            Powered by the official Premier League game — <b className="text-white">free to play</b>, real players, real points,
            and prizes you'll actually want. It's not live yet: get on the waitlist and you're first through the door.
          </p>
          <div className="mt-6"><WaitlistForm source="fantasy-hero" /></div>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
            <Users className="h-3.5 w-3.5" /> Founding members get in before anyone else.
          </p>
        </section>

        {/* ═══ 01 · PICK YOUR SQUAD ═══ */}
        <SectionHead eyebrow="01 · Your Team" title="Pick your squad">
          Use your <b className="text-white">£100m budget</b> to pick a squad of <b className="text-white">15 players</b> from
          the Premier League. Captain your talisman, bench your dead weight, and out-think everyone.
        </SectionHead>
        <div className={`relative ${BAND} flex items-center justify-center gap-3 overflow-hidden px-4 py-10`}>
          <JerseyCard name="Saka" team="ARS (H)" colour="#ef2b2d" tilt="-rotate-6" />
          <div className="z-10 -mx-4 grid place-items-center rounded-2xl bg-[#0d3b2e] px-4 py-6 text-center text-white shadow-[0_3px_5px_-1px_rgba(0,0,0,0.6),0_22px_38px_-16px_rgba(0,0,0,0.9)]">
            <Users className="h-6 w-6" />
            <span className="mt-1 font-display text-sm uppercase tracking-tight">Midfield</span>
          </div>
          <JerseyCard name="Palmer" team="CHE (A)" colour="#1e63d0" tilt="rotate-6" />
        </div>

        {/* ═══ 02 · THE PRIZES — real prize photography ═══ */}
        <SectionHead eyebrow="02 · The Prizes" title="Play for prizes that matter">
          This isn't bragging rights and a spreadsheet. Every gameweek there's something real on the line —
          and one season-long grand prize worth chasing all year.
        </SectionHead>
        <div className="grid gap-3 px-5 pb-8 sm:grid-cols-2 md:px-8">
          <PrizeCard
            big img="/images/fantasy/prizes/prize-tropical.jpg" Icon={Palmtree}
            tag="1st Prize · Season Winner" title="A dream tropical getaway"
            body="Win the season and you're not getting a mug — you're on a plane. Seven nights for two, anywhere the sun's shining."
          />
          <PrizeCard
            img="/images/fantasy/prizes/prize-voucher.jpg" Icon={Gift}
            tag="Weekly" title="Vouchers & rewards"
            body="Top the gameweek and bank a Footy Oracle voucher. Fresh shot every single week."
          />
          <PrizeCard
            img="/images/fantasy/prizes/prize-experiences.jpg" Icon={Ticket}
            tag="Monthly" title="Matchday experiences"
            body="Tickets, kit and matchday money-can't-buy bits for the month's best managers."
          />
        </div>

        {/* ═══ 03 · CREATE & JOIN LEAGUES ═══ */}
        <SectionHead eyebrow="03 · The League" title="Create & join leagues">
          Play against friends, family, colleagues — or the whole Footy Oracle community — in invitational leagues
          and cups. Live standings, updated every gameweek.
        </SectionHead>
        <div className={`relative ${BAND} px-4 py-9`}>
          <div className="mx-auto max-w-sm rounded-2xl bg-white p-3 shadow-[0_4px_6px_-2px_rgba(0,0,0,0.4),0_30px_55px_-22px_rgba(0,0,0,0.65)]">
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

        {/* ═══ 04 · BEAT THE GAFFER — facepalm cutout beside the table ═══ */}
        <SectionHead eyebrow="04 · The Rivalry" title="Beat The Gaffer">
          He picks a team too — and he's cocky about it. Finish above The Gaffer and you'll never let him hear
          the end of it. He knows it, too.
        </SectionHead>
        <div className={`relative ${BAND} overflow-hidden`}>
          <div className="relative flex items-end gap-1">
            <div className="min-w-0 flex-1 space-y-2.5 py-9 pl-4 pr-1">
              <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 shadow-[0_3px_5px_-1px_rgba(0,0,0,0.4),0_20px_36px_-18px_rgba(0,0,0,0.6)]">
                <span className="font-display text-lg text-[#2d0a4e]">1</span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><Crown className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px] uppercase leading-none tracking-tight text-[#2d0a4e]">Your team here</div>
                  <div className="truncate text-[11px] text-[#2d0a4e]/60">Top of the pile</div>
                </div>
                <span className="font-display text-lg text-[#2d0a4e]">680</span>
              </div>
              <div className="ml-5 flex items-center gap-2.5 rounded-2xl bg-white/85 px-3.5 py-3 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)]">
                <span className="font-display text-lg text-[#2d0a4e]">2</span>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-500 text-[10px] font-black text-white">▼</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px] uppercase leading-none tracking-tight text-[#2d0a4e]">The Gaffer XI</div>
                  <div className="truncate text-[11px] text-[#2d0a4e]/60">Not happy about it</div>
                </div>
                <span className="font-display text-lg text-[#2d0a4e]">675</span>
              </div>
            </div>
            {/* the Gaffer facepalming at his own position */}
            <img
              src="/images/gaffer/opt/gaffer-facepalm.webp"
              alt="The Gaffer facepalming"
              loading="lazy"
              draggable={false}
              className="pointer-events-none -mb-1 w-[34%] max-w-[240px] shrink-0 select-none self-end drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)]"
            />
          </div>
        </div>

        {/* ═══ FINAL CTA — the Gaffer points at YOU ═══ */}
        <section className="relative overflow-hidden bg-[#130321] px-5 pb-10 pt-8 md:px-8">
          <div className="relative z-10 flex items-center gap-3">
            <img
              src="/images/gaffer/opt/gaffer-pointing-you.webp"
              alt="The Gaffer pointing at you"
              loading="lazy"
              draggable={false}
              className="pointer-events-none w-[30%] max-w-[180px] shrink-0 select-none drop-shadow-[0_16px_32px_rgba(0,0,0,0.6)]"
            />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
                <Flame className="h-3 w-3" /> Be first in
              </span>
              <h2 className="mt-2 font-display text-3xl uppercase leading-[0.9] tracking-tight text-white md:text-5xl">
                The Gaffer wants <span className="text-[#f8e7a1]">you</span>
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-white/60">Drop your email and you're on the list. We'll only email you when it's ready to play.</p>
            </div>
          </div>
          <div className="relative z-10 mt-6"><WaitlistForm source="fantasy-footer" /></div>
        </section>
      </main>

      <div className="mx-auto mt-8 max-w-3xl px-3 pb-12 md:px-6"><FooterNavigation /></div>
    </div>
  );
}
