import {
  Activity,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Flame,
  Gauge,
  Radio,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
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
  opening_odds?: number | string;
  best_price?: number | string;
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
  const odds = toNumber(raw.best_price ?? raw.odds ?? raw.price, 1);
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
    placeholderReason:
      raw.gaffer_line ??
      raw.reason ??
      raw.short_reason ??
      `The board likes ${selection.toLowerCase()} here — ${prob}% confidence and ${odds.toFixed(2)} on the screen. Value, not vibes.`,
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

function confidenceTone(prob: number) {
  if (prob >= 74) return 'from-emerald-300 via-lime-300 to-gold';
  if (prob >= 66) return 'from-cyan-300 via-emerald-300 to-gold';
  return 'from-fuchsia-300 via-violet-300 to-gold';
}

function TeamPlate({ team, align = 'left' }: { team: Leg['home']; align?: 'left' | 'right' }) {
  return (
    <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <div className="relative">
        <div className="absolute inset-[-6px] rounded-2xl bg-white/10 blur-md" />
        <TeamAvatar name={team.name} logoUrl={team.logo} size={54} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-lg font-black uppercase leading-tight text-white md:text-xl">{team.name}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">{team.short}</div>
      </div>
    </div>
  );
}

function SelectionBoardCard({ leg, index }: { leg: Leg; index: number }) {
  const bookmakerLine = Math.max(1, Math.round(1000 / Math.max(leg.odds, 1)) / 10);

  return (
    <article className="group relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(245,197,66,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-300 hover:-translate-y-0.5 hover:border-gold/45 hover:shadow-[0_0_55px_-28px_hsl(var(--gold))] md:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="absolute right-4 top-4 rounded-full border border-gold/35 bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gold backdrop-blur">
        Pick {index + 1}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1"><Radio className="h-3.5 w-3.5 text-emerald-300" /> Live fixture</span>
        <span>{leg.region}</span>
        <span className="text-white/20">•</span>
        <span>{leg.league}</span>
        <span className="text-white/20">•</span>
        <span>{leg.time} KO</span>
      </div>

      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <TeamPlate team={leg.home} />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/45 font-display text-2xl text-gold shadow-[0_0_35px_-20px_hsl(var(--gold))]">VS</div>
        <TeamPlate team={leg.away} align="right" />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_0.78fr]">
        <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/[0.18] to-amber-300/[0.05] p-4">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.23em] text-gold/80"><Target className="h-4 w-4" /> Bet type</div>
          <div className="font-display text-3xl leading-none text-white md:text-4xl">{leg.selection}</div>
          <p className="mt-2 text-sm italic leading-relaxed text-white/70">“{leg.placeholderReason}”</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Price</div>
            <div className="font-display text-4xl leading-none text-gold">{leg.odds.toFixed(2)}</div>
            <div className="mt-1 text-xs text-white/45">Bookies imply {bookmakerLine}%</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/40"><span>Confidence</span><span className="text-white">{leg.prob}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full bg-gradient-to-r ${confidenceTone(leg.prob)}`} style={{ width: `${leg.prob}%` }} />
            </div>
            <div className="mt-1 text-xs text-white/45">Form signal</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Edge</div>
            <div className="flex items-end gap-2"><span className="font-display text-4xl leading-none text-emerald-300">+{leg.edge.toFixed(1)}</span><span className="pb-1 text-xs text-white/45">pts</span></div>
          </div>
        </div>
      </div>
    </article>
  );
}

function BroadcastTicker({ bet }: { bet: DailyBet }) {
  if (bet.type === 'none') return null;
  const selections = bet.legs.map((leg) => `${leg.home.short} v ${leg.away.short} · ${leg.selection} @ ${leg.odds.toFixed(2)}`).join('  •  ');
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-3">
      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-white/65">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-red-200"><span className="h-2 w-2 rounded-full bg-red-400" /> LIVE</span>
        <span className="truncate">{selections}</span>
      </div>
    </div>
  );
}

function BetSlip({ bet }: { bet: DailyBet }) {
  if (bet.type === 'none') return null;
  const impliedReturn = bet.returns - bet.stake;

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-gold/45 bg-[radial-gradient(circle_at_20%_0%,rgba(245,197,66,0.22),transparent_32%),linear-gradient(135deg,rgba(245,197,66,0.14),rgba(124,58,237,0.14),rgba(0,0,0,0.42))] p-5 shadow-[0_0_70px_-28px_hsl(var(--gold))]">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/35 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-gold">
            <Trophy className="h-4 w-4" /> The Gaffer's slip
          </div>
          <div className="font-display text-4xl leading-none text-white md:text-5xl">£{bet.stake} {bet.type === 'double' ? 'Daily Double' : 'Daily Single'}</div>
          <p className="mt-2 text-sm text-white/55">{bet.type === 'double' ? `${bet.legs.length} selections combined` : 'One selection'} · total price <span className="font-bold text-gold">{bet.combinedOdds.toFixed(2)}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Return</div>
            <div className="font-display text-4xl leading-none text-gold">£{bet.returns.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">Upside</div>
            <div className="font-display text-4xl leading-none text-emerald-300">+£{impliedReturn.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10"><ShieldCheck className="h-8 w-8 text-gold" /></div>
      <h3 className="font-display text-3xl text-white">No bet today.</h3>
      <p className="mx-auto mt-2 max-w-xl text-white/60">No value worth backing. The Gaffer would rather keep the powder dry than force a mug punt.</p>
    </div>
  );
}

export function GafferPicksBox() {
  const { data: live } = useLiveDailyPicks();
  const fallbackPicks = getGafferPicks();
  const fallbackBet = getDailyBet(fallbackPicks);
  const bet = live?.bet ?? fallbackBet;
  const updatedAt = live?.updatedAt ? new Date(live.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'daily refresh';
  const bestConfidence = bet.type === 'none' ? 0 : Math.max(...bet.legs.map((leg) => leg.prob));
  const averageEdge = bet.type === 'none' ? 0 : bet.legs.reduce((sum, leg) => sum + leg.edge, 0) / bet.legs.length;

  return (
    <section
      id="daily-picks"
      data-endpoint="gaffer_picks"
      data-lovable-hook="homepage_daily_picks_showcase"
      className="relative col-span-full overflow-hidden rounded-[2rem] border border-gold/45 bg-[#07020d] p-3 shadow-[0_0_110px_-36px_hsl(var(--gold))] md:p-4"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(245,197,66,0.20),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.22),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.11),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />
      <div className="pointer-events-none absolute -left-28 top-1/3 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />

      <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/35 p-4 backdrop-blur md:p-6">
        <div className="mb-5 grid gap-4 lg:grid-cols-[0.9fr_1.35fr] lg:items-stretch">
          <aside className="relative min-h-[380px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
            <img
              src={ASSETS.gaffer}
              alt="The Gaffer pointing at today's daily football selections"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              style={{ objectPosition: '55% 14%' }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_26%,transparent_0,rgba(0,0,0,0.05)_20%,rgba(0,0,0,0.72)_72%),linear-gradient(to_top,rgba(0,0,0,0.96),rgba(0,0,0,0.10))]" />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.23em] text-red-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.9)]" /> Live daily board
            </div>
            <div className="absolute right-4 top-4 rounded-full border border-gold/40 bg-black/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-gold backdrop-blur">
              Endpoint ready
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur">
                <CalendarClock className="h-3.5 w-3.5 text-gold" /> Updated {updatedAt}
              </div>
              <h2 className="font-display text-5xl leading-[0.86] text-white md:text-6xl">THE GAFFER'S DAILY PICKS</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">{live?.gafferIntro ?? "The Gaffer is pointing at the value. Teams, prices, markets, odds, confidence and badges are wired for live data."}</p>
            </div>
          </aside>

          <div className="flex flex-col gap-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-gold/80">
                    <Flame className="h-4 w-4" /> Premium daily selections
                  </div>
                  <h2 className="mt-1 font-display text-4xl leading-none text-white md:text-5xl">{live?.title ?? "Today's Value Board"}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/55">A TV-style betting board: fixtures, team logos, bet type, prices, confidence, edge, Gaffer line and return maths. Claude/Lovable hook included.</p>
                </div>
                <a href="#tip-of-the-day" className="inline-flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.10] px-4 py-2 text-xs font-black uppercase tracking-wide text-gold transition hover:bg-gold/20">
                  View all tips <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40"><Gauge className="h-4 w-4 text-emerald-300" /> Top signal</div>
                <div className="font-display text-4xl leading-none text-white">{bestConfidence || '—'}{bestConfidence ? '%' : ''}</div>
                <p className="mt-1 text-xs text-white/45">highest confidence</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40"><BarChart3 className="h-4 w-4 text-gold" /> Average edge</div>
                <div className="font-display text-4xl leading-none text-gold">{averageEdge ? `+${averageEdge.toFixed(1)}` : '—'}</div>
                <p className="mt-1 text-xs text-white/45">pricing gap</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40"><Zap className="h-4 w-4 text-fuchsia-300" /> Bet mode</div>
                <div className="font-display text-4xl leading-none text-white">{bet.type === 'none' ? 'PASS' : bet.type.toUpperCase()}</div>
                <p className="mt-1 text-xs text-white/45">live staking model</p>
              </div>
            </div>

            <BroadcastTicker bet={bet} />
          </div>
        </div>

        {bet.type === 'none' ? (
          <EmptyBoard />
        ) : (
          <div className="space-y-4">
            {bet.legs.map((leg, index) => <SelectionBoardCard key={leg.fixtureId} leg={leg} index={index} />)}
            <BetSlip bet={bet} />
          </div>
        )}

        <div className="mt-4 grid gap-3 text-[11px] text-white/50 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><Sparkles className="mb-1 h-4 w-4 text-gold" /> Live data: teams, logos, odds, markets</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" /> Safe fallback: form-table engine</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><Activity className="mb-1 h-4 w-4 text-fuchsia-300" /> Hook: homepage_daily_picks_showcase</div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><Target className="mb-1 h-4 w-4 text-cyan-300" /> Endpoint: Supabase gaffer_picks</div>
        </div>
      </div>
    </section>
  );
}
