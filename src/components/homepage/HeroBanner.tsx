import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Zap, BarChart3, TrendingUp, Trophy, Target, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TeamAvatar } from '@/components/TeamAvatar';
import { getDailyBet, getGafferPicks, type Leg, type DailyBet, STAKE } from '@/lib/gafferSelection';

const GAFFER_CUTOUT = '/images/gaffer/gaffer-arms-crossed.png';
const STADIUM_BG = '/images/backgrounds/bg-stadium.jpg';

// ─── Live pick plumbing — reads today's published gaffer_picks row ──────────
type RawPickLeg = {
  fixtureId?: string; fixture_id?: string; fixture?: string; match?: string; game?: string;
  home_team?: string; away_team?: string; homeTeam?: string; awayTeam?: string;
  home_logo?: string | null; away_logo?: string | null; homeLogo?: string | null; awayLogo?: string | null;
  league?: string; region?: string; kickoff_time?: string; time?: string;
  market?: string; bet_type?: string; selection?: string; label?: string;
  odds?: number | string; price?: number | string; best_price?: number | string;
  confidence?: number; probability?: number; formProb?: number; edge?: number;
  reason?: string; short_reason?: string; gaffer_line?: string;
};
type RawDailyPick = {
  id: string; title?: string | null; stake?: number | null; bet_type?: string | null;
  combined_odds?: number | string | null; potential_returns?: number | string | null;
  reasoning?: string | null; gaffer_intro?: string | null;
  updated_at?: string | null; legs?: RawPickLeg[] | null;
};
type LiveDailyPicks = { bet: DailyBet; updatedAt: string | null };

const parseTeams = (f?: string | null) => {
  if (!f) return { home: 'Home', away: 'Away' };
  const p = f.split(/\s+vs\s+|\s+v\s+|\s+-\s+/i);
  return p.length >= 2 ? { home: p[0].trim(), away: p[1].trim() } : { home: f, away: 'Away' };
};
const toNumber = (v: unknown, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
};
const normConf = (v: unknown, d = 72) => {
  const n = toNumber(v, d);
  return Math.max(1, Math.min(100, n <= 1 ? Math.round(n * 100) : Math.round(n)));
};
const formatKO = (raw?: string | null) => {
  if (!raw) return 'TBC';
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? raw : dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

function rawLegToLeg(raw: RawPickLeg, i: number): Leg {
  const parsed = parseTeams(raw.fixture ?? raw.match ?? raw.game ?? null);
  const home = raw.home_team ?? raw.homeTeam ?? parsed.home;
  const away = raw.away_team ?? raw.awayTeam ?? parsed.away;
  const market = raw.market ?? raw.bet_type ?? raw.label ?? 'Pick';
  const selection = raw.selection ?? raw.label ?? raw.bet_type ?? market;
  const odds = toNumber(raw.best_price ?? raw.odds ?? raw.price, 1);
  const prob = normConf(raw.confidence ?? raw.probability ?? raw.formProb, 72);
  const edge = toNumber(raw.edge, Math.max(1, prob - Math.round(100 / Math.max(odds, 1))));
  return {
    fixtureId: raw.fixtureId ?? raw.fixture_id ?? `${home}-${away}-${i}`,
    home: { name: home, short: home.slice(0, 3).toUpperCase(), logo: raw.home_logo ?? raw.homeLogo ?? null },
    away: { name: away, short: away.slice(0, 3).toUpperCase(), logo: raw.away_logo ?? raw.awayLogo ?? null },
    region: raw.region ?? 'Today',
    league: raw.league ?? 'Featured fixture',
    time: formatKO(raw.kickoff_time ?? raw.time),
    market: market.toLowerCase().includes('corner') ? 'Corners' : market.toLowerCase().includes('btts') ? 'BTTS' : 'Goals',
    selection, odds, prob, edge,
    flag: edge >= 8 ? 'strong' : 'value',
    placeholderReason: raw.gaffer_line ?? raw.reason ?? raw.short_reason ??
      `Board likes ${selection.toLowerCase()} — ${prob}% confidence at ${odds.toFixed(2)}. Value, not vibes.`,
  };
}

function buildBet(legs: Leg[], raw: RawDailyPick): DailyBet {
  if (legs.length === 0) return { type: 'none', legs: [] };
  const stake = raw.stake ?? STAKE;
  if ((raw.bet_type ?? '').toLowerCase() !== 'single' && legs.length >= 2) {
    const picked: [Leg, Leg] = [legs[0], legs[1]];
    const co = toNumber(raw.combined_odds, Number((picked[0].odds * picked[1].odds).toFixed(2)));
    return { type: 'double', legs: picked, combinedOdds: co, stake, returns: toNumber(raw.potential_returns, Number((stake * co).toFixed(2))) };
  }
  const picked: [Leg] = [legs[0]];
  const co = toNumber(raw.combined_odds, picked[0].odds);
  return { type: 'single', legs: picked, combinedOdds: co, stake, returns: toNumber(raw.potential_returns, Number((stake * co).toFixed(2))) };
}

function useLiveDailyPicks() {
  return useQuery({
    queryKey: ['homepage_daily_picks_showcase'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<LiveDailyPicks | null> => {
      const { data, error } = await (supabase as any)
        .from('gaffer_picks')
        .select('id, title, stake, bet_type, combined_odds, potential_returns, reasoning, gaffer_intro, legs, updated_at')
        .in('status', ['published', 'live', 'active'])
        .order('pick_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      const raw = data as RawDailyPick;
      const legs = Array.isArray(raw.legs) ? raw.legs.map(rawLegToLeg).sort((a, b) => b.edge - a.edge) : [];
      return { bet: buildBet(legs, raw), updatedAt: raw.updated_at ?? null };
    },
  });
}

/** Category filter chips — link to the relevant board views. */
const CHIPS: { label: string; to: string; hot?: boolean }[] = [
  { label: 'All Tips', to: '/form-tables', hot: true },
  { label: 'Tip of the Day', to: '#daily-picks' },
  { label: 'Value Picks', to: '/form-tables' },
  { label: 'BTTS', to: '/form-tables?cat=btts' },
  { label: 'Over 2.5', to: '/form-tables?cat=goals' },
  { label: 'Corners', to: '/form-tables?cat=corners' },
];

/** "3 minutes ago" style stamp for the live badge. */
function timeAgo(iso: string | null): string {
  if (!iso) return 'today';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'today';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return `${secs || 1} secs ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatPill({ icon: Icon, value, label }: { icon: typeof Zap; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/15 text-violet-200">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg leading-none text-white">{value}</span>
        <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-white/45">{label}</span>
      </span>
    </div>
  );
}

/** Confidence donut — pure SVG, no baked art. */
function ConfidenceRing({ pct }: { pct: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-12 w-12 place-items-center">
      <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke="url(#confGrad)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        />
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#f5c542" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-display text-[11px] text-white">{pct}%</span>
    </div>
  );
}

/** The featured "Tip of the Day" board — real teams, kickoff, market, odds, verdict. */
function TipOfTheDay({ leg }: { leg: Leg }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-[#0b0620]/80 shadow-[0_0_50px_-20px_rgba(139,92,246,0.9)]">
      {/* Gaffer cutout — foreground on the right, hidden on small screens */}
      <img
        src={GAFFER_CUTOUT}
        alt="The Gaffer"
        loading="eager"
        draggable={false}
        className="pointer-events-none absolute -right-6 bottom-0 z-0 hidden h-[112%] w-auto select-none object-contain object-bottom opacity-95 md:block"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-[1] hidden bg-gradient-to-l from-transparent via-[#0b0620]/20 to-[#0b0620] md:block"
      />

      <div className="relative z-[2] p-4 sm:p-5 md:pr-56 lg:pr-64">
        {/* header row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
            <Trophy className="h-3 w-3 fill-current" /> Tip of the Day
          </span>
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-violet-200/80">
            {leg.league}
          </span>
        </div>

        {/* teams + kickoff */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
            <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={44} />
            <span className="font-display text-sm leading-tight text-white sm:text-lg">{leg.home.name}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Live
            </span>
            <span className="mt-1 font-display text-xl leading-none text-white sm:text-2xl">{leg.time}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">Kick-off</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
            <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={44} />
            <span className="font-display text-sm leading-tight text-white sm:text-lg">{leg.away.name}</span>
          </div>
        </div>

        {/* market · odds · confidence · verdict */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Market</div>
            <div className="mt-0.5 truncate text-sm font-bold text-white">{leg.selection}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/45">Odds</div>
            <div className="mt-0.5 font-display text-lg leading-none text-[#f5c542]">{leg.odds.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
            <ConfidenceRing pct={leg.prob} />
            <div className="text-[9px] font-black uppercase leading-tight tracking-[0.14em] text-white/45">Confi-<br />dence</div>
          </div>
          <div className="col-span-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] px-3 py-2 sm:col-span-1">
            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200/80">
              <span className="text-sm leading-none">“</span> Gaffer Verdict
            </div>
            <div className="mt-0.5 line-clamp-2 text-[12px] italic leading-snug text-white/75">{leg.placeholderReason}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** No-games day — keep the hero alive with an honest no-tip board. */
function NoTipBoard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-[#0b0620]/80 p-5 shadow-[0_0_50px_-20px_rgba(139,92,246,0.9)]">
      <img
        src="/images/gaffer/gaffer-shocked.png"
        alt="The Gaffer — no value today"
        loading="eager"
        draggable={false}
        className="pointer-events-none absolute -right-4 bottom-0 z-0 hidden h-[115%] w-auto select-none object-contain object-bottom opacity-95 sm:block"
      />
      <div className="relative z-[1] max-w-[72%]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
          <Target className="h-3 w-3" /> No Bet Today
        </span>
        <h3 className="mt-3 font-display text-2xl uppercase leading-none tracking-tight text-white sm:text-3xl">Nowt worth your money.</h3>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          No value on the card today — so no bet. The Gaffer keeps his hands in his pockets. New slate lands tomorrow.
        </p>
      </div>
    </div>
  );
}

/** Secondary value on the board — compact rail under the featured tip. */
function FixtureRail({ legs }: { legs: Leg[] }) {
  if (legs.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {legs.slice(0, 3).map((leg) => (
        <div key={leg.fixtureId} className="rounded-xl border border-white/10 bg-[#0b0620]/70 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-200/70">
            <span className="truncate">{leg.league}</span>
            <span className="shrink-0 text-white/45">{leg.time} KO</span>
          </div>
          <div className="mt-1.5 truncate text-sm font-bold text-white">
            {leg.home.name} <span className="text-white/35">v</span> {leg.away.name}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">{leg.selection}</span>
            <span className="shrink-0 font-display text-base leading-none text-[#f5c542]">{leg.odds.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Hero — the "Live Tips" command centre. A real, coded section: floodlit stadium
 * backdrop, live headline + stats, category chips, the Gaffer's tip-of-the-day
 * board (wired to today's published pick) and a rail of the rest of the value.
 */
export function HeroBanner() {
  const { data: live } = useLiveDailyPicks();
  const fallbackPicks = getGafferPicks();
  const bet: DailyBet = live?.bet ?? getDailyBet(fallbackPicks);
  const updated = timeAgo(live?.updatedAt ?? null);

  // Featured tip + the rest of the value for the rail.
  const featured: Leg | null = bet.type !== 'none' ? bet.legs[0] : null;
  const railLegs: Leg[] = [
    ...(bet.type !== 'none' ? bet.legs.slice(1) : []),
    ...fallbackPicks.filter((p) => p.fixtureId !== featured?.fixtureId),
  ].filter((l, i, a) => a.findIndex((x) => x.fixtureId === l.fixtureId) === i);

  // Real, honest stats derived from today's pick.
  const legCount = bet.type !== 'none' ? bet.legs.length : 0;
  const tipsToday = Math.max(legCount, railLegs.length + legCount);
  const avgConf = featured
    ? Math.round((bet.legs as Leg[]).reduce((s, l) => s + l.prob, 0) / (bet.legs as Leg[]).length)
    : 0;
  const topOdds = featured ? Math.max(...(bet.legs as Leg[]).map((l) => l.odds)) : 0;
  const potReturn = bet.type !== 'none' ? bet.returns : 0;

  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px] scroll-mt-28">
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/25 shadow-[0_0_60px_-24px_rgba(139,92,246,0.8)]">
        {/* floodlit stadium backdrop */}
        <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${STADIUM_BG})` }} />
        <div aria-hidden className="absolute inset-0 bg-[#070312]/78" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#070312]/40 via-transparent to-[#070312]" />
        <div aria-hidden className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-violet-600/25 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-[90px]" />

        <div className="relative p-5 sm:p-7 md:p-9">
          {/* Top row: live badge + title | stats strip */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-rose-100">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                  </span>
                  Live
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Updated {updated}</span>
              </div>

              <h1 className="mt-3 font-display text-5xl uppercase leading-[0.9] tracking-tight text-white antialiased sm:text-6xl lg:text-7xl">
                Live{' '}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Tips</span>
              </h1>
              <p className="mt-2 max-w-md text-sm text-white/65 sm:text-base">
                Today's picks from <span className="font-bold text-[#f8e7a1]">The Gaffer</span> — form-driven value, refreshed every morning.
              </p>
            </div>

            {/* stats strip */}
            {featured && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur sm:grid-cols-4 lg:shrink-0">
                <StatPill icon={Zap} value={String(tipsToday)} label="Tips Today" />
                <StatPill icon={BarChart3} value={`${avgConf}%`} label="Avg Confidence" />
                <StatPill icon={TrendingUp} value={topOdds.toFixed(2)} label="Top Odds" />
                <StatPill icon={Trophy} value={`£${potReturn.toFixed(0)}`} label="£10 Returns" />
              </div>
            )}
          </div>

          {/* category chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide transition-all ${
                  c.hot
                    ? 'border-violet-400/50 bg-violet-500/20 text-white hover:bg-violet-500/30'
                    : 'border-white/12 bg-white/[0.04] text-white/70 hover:border-white/30 hover:text-white'
                }`}
              >
                {c.label}
              </Link>
            ))}
          </div>

          {/* featured tip board */}
          <div className="mt-5">
            {featured ? <TipOfTheDay leg={featured} /> : <NoTipBoard />}
          </div>

          {/* secondary value rail */}
          {railLegs.length > 0 && (
            <div className="mt-3">
              <FixtureRail legs={railLegs} />
            </div>
          )}

          {/* bottom action bar */}
          <div className="mt-5 flex flex-col items-stretch gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 px-1 text-white/60">
              <TrendingUp className="h-4 w-4 shrink-0 text-emerald-300" />
              <span className="text-sm">Tips refresh every morning — <span className="text-white/85">never miss the value.</span></span>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link
                to="/form-tables"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_40px_-16px_rgba(139,92,246,1)] transition-all hover:-translate-y-0.5 hover:from-violet-400 hover:to-fuchsia-400"
              >
                View All Tips <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-400"
              >
                <Trophy className="h-4 w-4 fill-current" /> Join the Club
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
