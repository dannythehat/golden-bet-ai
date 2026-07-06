import { useEffect, useState } from 'react';
import { Bell, Check, Sunrise, AlarmClock, Zap, PhoneMissed } from 'lucide-react';
import { FAMILIES, VALUE_MARKETS, type ValueMarketKey } from '@/lib/valueBoard';
import {
  DEFAULT_ALERT_PREFS, useSaveUserValueAlertPreferences, useUserValueAlertPreferences,
  type AlertPreferences,
} from '@/hooks/useValueBoard';

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${on
        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
        : 'border-white/12 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]'}`}
    >
      {on && <Check className="h-3 w-3" />} {children}
    </button>
  );
}

/** Email alert preferences — Gaffer card / specific markets / all value /
 *  quiet-day callback, with timing options. Saves to the KV-backed endpoint. */
export function EmailAlertPreferences({ pendingMarket, onConsumedPending }: {
  pendingMarket: ValueMarketKey | null;
  onConsumedPending: () => void;
}) {
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('fo_alert_email') ?? ''; } catch { return ''; } });
  const [prefs, setPrefs] = useState<Omit<AlertPreferences, 'email'>>(DEFAULT_ALERT_PREFS);
  const { prefs: stored } = useUserValueAlertPreferences(email.includes('@') ? email : null);
  const { save, saving, saved, error, resetSaved } = useSaveUserValueAlertPreferences();

  // Load stored prefs once they arrive.
  useEffect(() => { if (stored) setPrefs({ ...DEFAULT_ALERT_PREFS, ...stored }); }, [stored]);

  // "Add this market to alerts" from the breakdown panel lands here.
  useEffect(() => {
    if (!pendingMarket) return;
    setPrefs((p) => p.marketKeys.includes(pendingMarket) ? p : { ...p, marketKeys: [...p.marketKeys, pendingMarket], gafferCardOnly: false });
    onConsumedPending();
  }, [pendingMarket, onConsumedPending]);

  const toggleMarket = (k: ValueMarketKey) => {
    resetSaved();
    setPrefs((p) => ({
      ...p,
      gafferCardOnly: false,
      marketKeys: p.marketKeys.includes(k) ? p.marketKeys.filter((x) => x !== k) : [...p.marketKeys, k],
    }));
  };
  const set = (patch: Partial<Omit<AlertPreferences, 'email'>>) => { resetSaved(); setPrefs((p) => ({ ...p, ...patch })); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    void save({ email: email.trim().toLowerCase(), ...prefs });
  };

  return (
    <section id="value-alerts" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#130321]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="p-5 md:p-7">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-violet-200">
          <Bell className="h-3.5 w-3.5" /> Email Alerts
        </span>
        <h2 className="mt-2.5 font-display text-2xl uppercase tracking-tight text-white md:text-3xl">The value finds you</h2>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55">
          Pick what you want in your inbox — the Gaffer's daily card, the markets you personally follow, everything,
          or just an honest "nothing today" so you never wonder.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {/* alert groups */}
          <div className="flex flex-wrap gap-1.5">
            <Toggle on={prefs.gafferCardOnly} onClick={() => set({ gafferCardOnly: !prefs.gafferCardOnly, allValueAlerts: false, marketKeys: [] })}>Gaffer card only</Toggle>
            <Toggle on={prefs.allValueAlerts} onClick={() => set({ allValueAlerts: !prefs.allValueAlerts, gafferCardOnly: false })}>All value alerts</Toggle>
            <Toggle on={prefs.quietDayCallback} onClick={() => set({ quietDayCallback: !prefs.quietDayCallback })}><PhoneMissed className="h-3 w-3" /> Quiet-day callback</Toggle>
          </div>

          {/* market toggles by family */}
          {!prefs.gafferCardOnly && !prefs.allValueAlerts && (
            <div className="space-y-2.5 rounded-[13px] border border-white/[0.09] bg-black/20 p-3.5">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Or pick your exact markets</div>
              {FAMILIES.map((f) => (
                <div key={f.family} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-16 shrink-0 text-[10px] font-black uppercase tracking-wide text-[#f8e7a1]/70">{f.label}</span>
                  {VALUE_MARKETS.filter((m) => m.family === f.family).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleMarket(m.key)}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${prefs.marketKeys.includes(m.key)
                        ? 'bg-violet-500/25 text-violet-100 ring-1 ring-inset ring-violet-400/50'
                        : 'bg-white/[0.04] text-white/50 ring-1 ring-inset ring-white/10 hover:bg-white/[0.08]'}`}
                    >
                      {m.family === 'btts' ? (m.side === 'yes' ? 'BTTS Yes' : 'BTTS No') : `${m.side === 'over' ? 'O' : 'U'} ${m.line}`}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* timing */}
          <div className="flex flex-wrap gap-1.5">
            <Toggle on={prefs.timing.morningScan} onClick={() => set({ timing: { ...prefs.timing, morningScan: !prefs.timing.morningScan } })}><Sunrise className="h-3 w-3" /> Morning scan</Toggle>
            <Toggle on={prefs.timing.preKickoff} onClick={() => set({ timing: { ...prefs.timing, preKickoff: !prefs.timing.preKickoff } })}><AlarmClock className="h-3 w-3" /> Pre-kickoff reminder</Toggle>
            <Toggle on={prefs.timing.newValueAppears} onClick={() => set({ timing: { ...prefs.timing, newValueAppears: !prefs.timing.newValueAppears } })}><Zap className="h-3 w-3" /> New value appears</Toggle>
          </div>

          {/* email + save */}
          <div className="flex max-w-xl flex-col gap-2.5 sm:flex-row">
            <input
              value={email}
              onChange={(e) => { setEmail(e.target.value); resetSaved(); }}
              type="email"
              required
              aria-label="Email address for alerts"
              placeholder="your@email.com"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#160b2e] px-4 py-3 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-violet-400/60"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_36px_-14px_rgba(217,70,239,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Bell className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Alert Preferences'}
            </button>
          </div>
          {saved && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300">
              <Check className="h-4 w-4" /> Saved — the Gaffer knows where to find you.
            </div>
          )}
          {error && <div className="text-sm font-bold text-rose-300">{error}</div>}
          <p className="text-[10.5px] text-white/35">Alerts go live 1st August — preferences saved now carry over. No spam, ever.</p>
        </form>
      </div>
    </section>
  );
}
