import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowRight, Check } from 'lucide-react';
import { Countdown } from '@/components/fantasy/Countdown';
import { supabase } from '@/integrations/supabase/client';

const POSTER = '/images/fantasy/fantasy-coming-soon.jpg';
// Registration target for the coming-soon countdown (season opens Aug 2026).
const REG_OPEN = '2026-08-01T18:00:00Z';

/**
 * FantasyLeagueSellItSection — the homepage "coming soon" feature for the Footy
 * Oracle Fantasy Premier League. The cinematic poster is the hero; below it a
 * live registration countdown and an email capture (real interactive HTML).
 * Links through to the full /fantasy-league preview.
 */
export function FantasyLeagueSellItSection() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setDone(true); // optimistic — don't make them wait on the network
    try { localStorage.setItem('fantasy_waitlist_email', clean); } catch { /* ignore */ }
    // Persist to the waitlist (fire-and-forget; localStorage is the fallback).
    void supabase.functions.invoke('fantasy-waitlist', { body: { email: clean, source: 'homepage' } }).catch(() => {});
  };

  return (
    <section
      id="fantasy-league"
      className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/30 bg-[#0a0414] shadow-[0_0_70px_-26px_rgba(124,58,237,0.85)] md:rounded-[2rem]"
    >
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      {/* ── cinematic poster ── */}
      <div className="relative">
        <img
          src={POSTER}
          alt="Footy Oracle Fantasy Premier League — coming soon"
          loading="lazy"
          draggable={false}
          className="w-full select-none object-cover"
        />
        {/* fade the poster into the sign-up panel */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a0414] to-transparent" />
      </div>

      {/* ── live registration panel ── */}
      <div className="relative px-5 pb-7 pt-5 md:px-9 md:pb-10 md:pt-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-violet-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 [animation:pulse_2s_ease-in-out_infinite]" /> Registration opening soon
          </span>

          <h3 className="mt-4 font-display text-3xl uppercase leading-none text-white md:text-4xl">
            Be first through the door
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/60">
            Draft your XI, climb the table each gameweek and play for real prizes. Drop your email and we’ll tell you the
            moment the league opens — no spam, Gaffer’s word.
          </p>

          {/* countdown */}
          <div className="mt-5 flex justify-center">
            <Countdown deadline={REG_OPEN} />
          </div>

          {/* email capture */}
          {done ? (
            <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300">
              <Check className="h-4 w-4" /> You’re on the list — Gaffer’s word.
            </div>
          ) : (
            <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                aria-label="Email address"
                placeholder="your@email.com"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#120726] px-4 py-3 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-violet-400/60"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_36px_-14px_rgba(217,70,239,0.9)] transition-transform hover:-translate-y-0.5"
              >
                <Bell className="h-4 w-4" /> Notify me
              </button>
            </form>
          )}

          <div className="mt-5">
            <Link to="/fantasy-league" className="inline-flex items-center gap-1.5 text-[13px] font-black uppercase tracking-wide text-[#f8e7a1] transition-colors hover:text-white">
              Preview the league <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
