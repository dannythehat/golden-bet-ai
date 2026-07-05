import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Lock, Users } from 'lucide-react';

type Signup = { email: string; ts: string; country?: string; source?: string; name?: string };

const KEY_STORE = 'fo_admin_key';

export default function AdminWaitlist() {
  const [key, setKey] = useState(() => localStorage.getItem(KEY_STORE) || '');
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<Signup[]>([]);
  const [count, setCount] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'unauth' | 'error'>('idle');

  const load = useCallback(async (k: string) => {
    if (!k) return;
    setState('loading');
    try {
      const res = await fetch(`/api/waitlist?key=${encodeURIComponent(k)}`, { headers: { 'cache-control': 'no-cache' } });
      if (res.status === 401) { setState('unauth'); return; }
      const data = await res.json();
      if (data.ok) { setRows(data.signups || []); setCount(data.count || 0); setState('ok'); }
      else setState('error');
    } catch { setState('error'); }
  }, []);

  useEffect(() => { if (key) load(key); }, [key, load]);

  function unlock(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(KEY_STORE, input.trim());
    setKey(input.trim());
  }

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // ── gate ──
  if (!key || state === 'unauth') {
    return (
      <div className="grid min-h-screen place-items-center bg-[#07000f] px-4 text-white">
        <form onSubmit={unlock} className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#130321] p-6 shadow-[0_22px_70px_-32px_rgba(245,197,66,0.6)]">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#f5c542]/15 text-[#f5c542]"><Lock className="h-5 w-5" /></div>
          <h1 className="font-display text-2xl uppercase tracking-tight">Waitlist admin</h1>
          <p className="mt-1 text-sm text-white/50">Enter the admin key to view signups.</p>
          <input
            type="password" value={input} onChange={(e) => setInput(e.target.value)} autoFocus placeholder="Admin key"
            className="mt-4 h-12 w-full rounded-xl border border-white/15 bg-[#07000f]/80 px-3 text-white outline-none focus:border-[#f5c542]/60"
          />
          {state === 'unauth' && <p className="mt-2 text-xs text-rose-300">Wrong key — try again.</p>}
          <button className="mt-3 h-12 w-full rounded-xl bg-[#f5c542] font-black uppercase tracking-wide text-[#16051f]">Unlock</button>
          <Link to="/" className="mt-3 block text-center text-xs text-white/40 hover:text-white/70">Back to site</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07000f] text-white">
      <main className="mx-auto max-w-3xl px-3 py-6 md:px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-[#f5c542]"><ArrowLeft className="h-4 w-4" /> Site</Link>
          <div className="flex items-center gap-2">
            <button onClick={() => load(key)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70 hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <a href={`/api/waitlist?key=${encodeURIComponent(key)}&format=csv`} className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 px-3 py-1.5 text-xs font-bold text-[#f8e7a1] hover:bg-[#f5c542]/20">
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          </div>
        </div>

        {/* count */}
        <div className="mt-4 rounded-2xl border border-[#f5c542]/25 bg-[#130321] p-6">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/50"><Users className="h-4 w-4 text-[#f5c542]" /> Fantasy waitlist</div>
          <div className="mt-1 font-display text-6xl leading-none text-[#f8e7a1] text-extrude">{count}</div>
          <div className="mt-1 text-sm text-white/45">{count === 1 ? 'person wants in' : 'people want in'}</div>
        </div>

        {/* list */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/40">
            <span>Email</span><span className="text-right">When</span><span className="w-10 text-right">Geo</span>
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-white/40">{state === 'loading' ? 'Loading…' : 'No signups yet.'}</div>
          ) : rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-white/5 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate text-white/90">{r.email}</div>
                {(r.name || r.source) && <div className="truncate text-[11px] text-white/35">{[r.name, r.source].filter(Boolean).join(' · ')}</div>}
              </div>
              <div className="whitespace-nowrap text-right text-[12px] text-white/45">{fmt(r.ts)}</div>
              <div className="w-10 text-right text-[12px] text-white/45">{r.country || '—'}</div>
            </div>
          ))}
        </div>
        {state === 'error' && <p className="mt-3 text-center text-sm text-rose-300">Couldn't load. Check your connection and refresh.</p>}
      </main>
    </div>
  );
}
