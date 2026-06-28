import { Flag, Target, CreditCard, Radio, Check, Clock } from "lucide-react";
import { todaysPickSample, type PickLeg, type TodaysPick } from "@/data/todaysPickSample";

const ICON = { goals: Target, corners: Flag, cards: CreditCard } as const;

function legState(leg: PickLeg) {
  const hit = leg.live.current > leg.line;
  const needed = Math.max(0, Math.ceil(leg.line - leg.live.current));
  // progress toward the line (a hit shows full + a touch beyond)
  const pct = Math.min(100, Math.round((leg.live.current / (leg.line + 0.5)) * 100));
  return { hit, needed, pct };
}

function LegRow({ leg }: { leg: PickLeg }) {
  const Icon = ICON[leg.stat];
  const { hit, needed, pct } = legState(leg);
  const live = leg.live.status === "live";
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 text-gold shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{leg.market}</p>
            <p className="text-[11px] text-muted-foreground truncate">{leg.home} v {leg.away} · {leg.league}</p>
          </div>
        </div>
        {live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive shrink-0">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" /></span>
            {leg.live.minute}'
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0"><Clock className="h-3 w-3" />{leg.live.status === "ft" ? "FT" : "KO soon"}</span>
        )}
      </div>

      {/* Live count vs line */}
      <div className="flex items-end justify-between mb-1.5">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-black tabular-nums ${hit ? "text-success" : "text-foreground"}`}>{leg.live.current}</span>
          <span className="text-xs text-muted-foreground">/ {leg.line} {leg.stat}</span>
        </div>
        {hit ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><Check className="h-3.5 w-3.5" />LANDED</span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">needs {needed} more</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${hit ? "bg-success" : "bg-gold"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LivePickTracker({ pick = todaysPickSample, preview = true }: { pick?: TodaysPick; preview?: boolean }) {
  if (!pick || pick.betType === "none" || pick.legs.length === 0) return null;
  const anyLive = pick.legs.some((l) => l.live.status === "live");
  const landed = pick.legs.filter((l) => l.live.current > l.line).length;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/12 to-navy-dark p-5 md:p-6 shadow-xl shadow-gold/10">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_85%_15%,hsl(var(--gold)/0.22),transparent_55%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive">
              <Radio className="h-3.5 w-3.5" /> {anyLive ? "Live now" : "Today's bet"}
            </span>
            {pick.betType === "double" && <span className="text-[11px] font-semibold text-gold">Double · {landed}/{pick.legs.length} landed</span>}
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">£{pick.stake} returns</div>
            <div className="text-lg font-black text-gold tabular-nums">£{pick.potentialReturn.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {pick.legs.map((leg, i) => <LegRow key={i} leg={leg} />)}
        </div>

        <p className="text-xs text-foreground/80 mt-3 italic">"{pick.reasoning}"</p>
        {preview && (
          <p className="text-[10px] text-muted-foreground mt-2">Preview — sample fixture. Live counts update from real match data once the Gaffer's running.</p>
        )}
      </div>
    </section>
  );
}
