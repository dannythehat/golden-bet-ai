import { Activity, CalendarClock, ChevronRight, Flame, Quote, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamAvatar } from '@/components/TeamAvatar';
import { ASSETS } from './content';
import { getDailyBet, getGafferPicks, type DailyBet, type Leg, STAKE } from '@/lib/gafferSelection';

type RawPickLeg = {
  fixtureId?: string;
  fixture_id?: string;
  fixture?: string;
  match?: string;
  game?: string;
  home_team?: string;
  away_team?: string;
  homeTeam?: string;
  awayTeam?: string;
  home_logo?: string | null;
  away_logo?: string | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
  league?: string;
  region?: string;
  kickoff_time?: string;
  time?: string;
  market?: string;
  bet_type?: string;
  selection?: string;
  label?: string;
  odds?: number | string;
  price?: number | string;
  confidence?: number;
  probability?: number;
  formProb?: number;
  edge?: number;
  reason?: string;
  short_reason?: string;
  gaffer_line?: string;
  status?: string;
};

type RawDailyPick = {
  id: string;
  pick_date?: string | null;
  title?: string | null;
  status?: string | null;
  stake?: number | null;
  bet_type?: 'single' | 'double' | 'treble' | string | null;
  combined_odds?: number | string | null;
  potential_returns?: number | string | null;
  reasoning?: string | null;
  gaffer_intro?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  legs?: RawPickLeg[] | null;
};

type LiveDailyPicks = {
  id: string;
  title: string;
  status: string;
  updatedAt: string | null;
  gafferIntro: string;
  bet: DailyBet;
};

const parseTeams = (fixture?: string | null) => {
  if (!fixture) return { home: 'Home', away: 'Away' };
  const parts = fixture.split(/\s+vs\s+|\s+v\s+|\s+-\s+/i);
  return parts.length >= 2 ? { home: parts[0].trim(), away: parts[1].trim() } : { home: fixture, away: 'Away' };
};

const toNumber = (value: unknown, fallback = 0) => {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const normaliseConfidence = (value: unknown, fallback = 72) => {
  const n = toNumber(value, fallback);
  return Math.max(1, Math.min(100, n <= 1 ? Math.round(n * 100) : Math.round(n)));
};

const formatKickoff = (raw?: string | null) => {
  if (!raw) return 'TBC';
  if (/^\d{1,2}:\d{2}/.test(raw)) return raw;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

function rawLegToLeg(raw: RawPickLeg, index: number): Leg {
  const parsed = parseTeams(raw.fixture ?? raw.match ?? raw.game ?? null);
  const homeName = raw.home_team ?? raw.homeTeam ?? parsed.home;
  const awayName = raw.away_team ?? raw.awayTeam ?? parsed.away;
  const market = raw.market ?? raw.bet_type ?? raw.label ?? "The Gaffer's Pick";
  const selection = raw.selection ?? raw.label ?? raw.bet_type ?? market;
  const odds = toNumber(raw.odds ?? raw.price, 1);
  const prob = normaliseConfidence(raw.confidence ?? raw.probability ?? raw.formProb, 72);
  const edge = toNumber(raw.edge, Math.max(1, prob - Math.round(100 / Math.max(odds, 1))));

  return {
    fixtureId: raw.fixtureId ?? raw.fixture_id ?? `${homeName}-${awayName}-${index}`,
    home: { name: homeName, short: homeName.slice(0, 3).toUpperCase(), logo: raw.home_logo ?? raw.homeLogo ?? null },
    away: { name: awayName, short: awayName.slice(0, 3).toUpperCase(), logo: raw.away_logo ?? raw.awayLogo ?? null },
    region: raw.region ?? 'Today',
    league: raw.league ?? 'Featured fixture',
    time: formatKickoff(raw.kickoff_time ?? raw.time),
    market: market.toLowerCase().includes('corner') ? 'Corners' : market.toLowerCase().includes('btts') ? 'BTTS' : 'Goals',
    selection,
    odds,
    prob,
    edge,
    flag: edge >= 8 ? 'strong' : 'value',
    placeholderReason: raw.gaffer_line ?? raw.reason ?? raw.short_reason ?? `The board likes ${selection.toLowerCase()} here — ${prob}% confidence and a price at ${odds.toFixed(2)}. That's value, not vibes.`,
  };
}

function buildBet(legs: Leg[], raw: RawDailyPick): DailyBet {
  if (legs.length === 0) return { type: 'none', legs: [] };
  const stake = raw.stake ?? STAKE;
  if ((raw.bet_type ?? '').toLowerCase() !== 'single' && legs.length >= 2) {
    const picked: [Leg, Leg] = [legs[0], legs[1]];
    const combinedOdds = toNumber(raw.combined_odds, Number((picked[0].odds * picked[1].odds).toFixed(2)));
    return { type: 'double', legs: picked, combinedOdds, stake, returns: toNumber(raw.potential_returns, Number((stake * combinedOdds).toFixed(2))) };
  }
  const picked: [Leg] = [legs[0]];
  const combinedOdds = toNumber(raw.combined_odds, picked[0].odds);
  return { type: 'single', legs: picked, combinedOdds, stake, returns: toNumber(raw.potential_returns, Number((stake * combinedOdds).toFixed(2))) };
}

function useLiveDailyPicks() {
  return useQuery({
    queryKey: ['homepage_daily_picks_showcase'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<LiveDailyPicks | null> => {
      const { data, error } = await (supabase as any)
        .from('gaffer_picks')
        .select('id, pick_date, title, status, stake, bet_type, combined_odds, potential_returns, reasoning, gaffer_intro, updated_at, created_at, legs')
        .in('status', ['published', 'live', 'active'])
        .order('pick_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      const raw = data as RawDailyPick;
      const legs = Array.isArray(raw.legs) ? raw.legs.map(rawLegToLeg).sort((a, b) => b.edge - a.edge) : [];

      return {
        id: raw.id,
        title: raw.title ?? "Today's Gaffer Picks",
        status: raw.status ?? 'published',
        updatedAt: raw.updated_at ?? raw.created_at ?? raw.pick_date ?? null,
        gafferIntro: raw.gaffer_intro ?? raw.reasoning ?? "I've stared at the form, shouted at the numbers, and these are the selections that made the board.",
        bet: buildBet(legs, raw),
      };
    },
  });
}

function LegRow({ leg, index }: { leg: Leg; index: number }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-gold/40 hover:bg-white/[0.07]">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold via-fuchsia-500 to-violet-500 opacity-80" />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-gold/80">
            <ShieldCheck className="h-3.5 w-3.5" /> Selection {index + 1} · {leg.market}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex shrink-0 -space-x-2">
              <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={38} />
              <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={38} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-white md:text-lg">
                {leg.home.name} <span className="text-white/35">v</span> {leg.away.name}
              </h3>
              <p className="truncate text-xs text-white/45">{leg.region} · {leg.league} · {leg.time} KO</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gold/25 bg-gold/[0.08] px-3 py-2 text-center shadow-[0_0_28px_-16px_hsl(var(--gold))]">
          <div className="font-display text-2xl leading-none text-gold">{leg.odds.toFixed(2)}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-white/45">price</div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 pl-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <span className="inline-flex w-fit items-center rounded-lg bg-gradient-to-r from-gold to-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wide text-black">
          {leg.selection}
        </span>
        <span className="inline-flex w-fit items-center gap-1 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
          <Activity className="h-3.5 w-3.5" /> {leg.prob}% form signal
        </span>
      </div>

      <p className="mt-3 flex gap-2 pl-2 text-sm italic leading-relaxed text-white/72">
        <Quote className="mt-0.5 h-4 w-4 shrink-0 text-gold/70" />{leg.placeholderReason}
      </p>
    </article>
  );
}

function BetSlip({ bet }: { bet: DailyBet }) {
  if (bet.type === 'none') return null;
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-r from-gold/[0.16] via-white/[0.06] to-violet-500/[0.12] p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-display text-2xl tracking-wide text-gold">
            <Trophy className="h-5 w-5" /> £{bet.stake} {bet.type === 'double' ? 'DAILY DOUBLE' : 'DAILY SINGLE'}
          </div>
          <p className="text-xs text-white/55">{bet.type === 'double' ? `${bet.legs.length} legs combined` : 'one clean selection'} · combined price {bet.combinedOdds.toFixed(2)}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-display text-3xl text-white">£{bet.returns.toFixed(2)}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-white/45">potential return</div>
        </div>
      </div>
    </div>
  );
}

export function GafferPicksBox() {
  const { data: live } = useLiveDailyPicks();
  const fallbackPicks = getGafferPicks();
  const fallbackBet = getDailyBet(fallbackPicks);
  const bet = live?.bet ?? fallbackBet;
  const updatedAt = live?.updatedAt ? new Date(live.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'daily refresh';

  return (
    <section id="daily-picks" data-endpoint="gaffer_picks" data-lovable-hook="homepage_daily_picks_showcase" className="relative overflow-hidden rounded-[1.75rem] border border-gold/40 bg-gradient-to-br from-[#211104] via-[#160620] to-[#06020d] p-5 shadow-[0_0_80px_-25px_hsl(var(--gold))] md:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-fuchsia-600/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_34%,rgba(245,197,66,0.08)_70%,transparent)] opacity-60" />

      <div className="relative grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch">
        <aside className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4">
          <img src={ASSETS.gaffer} alt="The Gaffer pointing at today's daily football selections" className="absolute inset-0 h-full w-full object-cover opacity-80" style={{ objectPosition: '56% 18%' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
          <div className="absolute right-4 top-4 rounded-full border border-gold/40 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gold">
            Live board
          </div>
          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur">
              <CalendarClock className="h-3.5 w-3.5 text-gold" /> Updated {updatedAt}
            </div>
            <h2 className="font-display text-4xl leading-none text-white md:text-5xl">THE DAILY PICKS</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">{live?.gafferIntro ?? "The Gaffer is pointing at the value. Teams, prices, markets and badges are ready for the live feed."}</p>
          </div>
        </aside>

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-gold/80">
                <Flame className="h-4 w-4" /> Endpoint ready · Supabase gaffer_picks
              </div>
              <h2 className="mt-1 font-display text-3xl tracking-wide text-white md:text-4xl">{live?.title ?? "Today's Gaffer Selections"}</h2>
              <p className="text-sm text-white/55">Teams, prices, bet type, confidence, logos and Gaffer reasoning are live-wired for Claude and Lovable.</p>
            </div>
            <a href="#tip-of-the-day" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:border-gold/45 hover:text-gold">
              View all tips <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {bet.type === 'none' ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-white/70">
              No value worth backing today, lads. No bet — that's a winning move some days.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {bet.legs.map((leg, index) => <LegRow key={leg.fixtureId} leg={leg} index={index} />)}
              </div>
              <BetSlip bet={bet} />
            </>
          )}

          <div className="mt-4 grid gap-2 text-[11px] text-white/45 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><Sparkles className="mb-1 h-4 w-4 text-gold" /> Live data: teams, logos, odds</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" /> Safe fallback: form tables</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><Activity className="mb-1 h-4 w-4 text-fuchsia-300" /> Hook: homepage_daily_picks_showcase</div>
          </div>
        </div>
      </div>
    </section>
  );
}
