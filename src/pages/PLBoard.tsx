import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, Target, Percent, Flame, Trophy, Info, Layers,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import sample from "@/data/gafferResultsSample.json";

interface Leg { market: string; home: string; away: string; league: string; odds: number }
interface Bet { id: number; date: string; type: "single" | "double"; odds: number; stake: number; result: "won" | "lost"; pl: number; legs: Leg[] }
const DATA = sample as { note: string; bets: Bet[] };

type Period = "all" | "30d" | "7d";
type Market = "All" | "Goals" | "Corners" | "Cards" | "BTTS";
const MARKETS: Market[] = ["All", "Goals", "Corners", "Cards", "BTTS"];

const gbp = (n: number) => `${n >= 0 ? "+" : "−"}£${Math.abs(n).toFixed(2)}`;
const legMatches = (l: Leg, m: Market) => m === "All" || l.market.toLowerCase().includes(m.toLowerCase());

export default function PLBoard() {
  const [period, setPeriod] = useState<Period>("all");
  const [market, setMarket] = useState<Market>("All");

  const bets = useMemo(() => {
    const sorted = [...DATA.bets].sort((a, b) => a.date.localeCompare(b.date));
    const maxDate = sorted.length ? new Date(sorted[sorted.length - 1].date).getTime() : 0;
    const cutoff = period === "all" ? 0 : maxDate - (period === "30d" ? 30 : 7) * 86400000;
    return sorted.filter(
      (b) => new Date(b.date).getTime() >= cutoff && b.legs.some((l) => legMatches(l, market)),
    );
  }, [period, market]);

  const s = useMemo(() => {
    const wins = bets.filter((b) => b.result === "won").length;
    const losses = bets.length - wins;
    const staked = bets.reduce((a, b) => a + b.stake, 0);
    const net = bets.reduce((a, b) => a + b.pl, 0);
    const avgOdds = bets.length ? bets.reduce((a, b) => a + b.odds, 0) / bets.length : 0;
    // current streak (most recent backwards)
    let streak = 0, sign = "";
    for (let i = bets.length - 1; i >= 0; i--) {
      const r = bets[i].result === "won" ? "W" : "L";
      if (!sign) { sign = r; streak = 1; } else if (r === sign) streak++; else break;
    }
    return { wins, losses, staked, net, roi: staked ? (net / staked) * 100 : 0, avgOdds, streak, sign };
  }, [bets]);

  const chart = useMemo(() => {
    let run = 0;
    return bets.map((b) => ({ date: b.date.slice(5), pl: +(run += b.pl).toFixed(2) }));
  }, [bets]);

  const recent = [...bets].reverse();

  return (
    <div className="min-h-screen bg-background sparkle-bg flex flex-col">
      <Navigation activeSection="home" onSectionChange={() => {}} />
      <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16 flex-1 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div className="mb-4">
          <h1 className="text-3xl md:text-4xl font-black">The Gaffer's <span className="text-gold">P&amp;L</span></h1>
          <p className="text-sm text-muted-foreground">Every pick. Every result. Timestamped, settled, never rewritten.</p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 mb-5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <span>Preview with sample data to show the board. Real settled picks replace this once the Gaffer goes live.</span>
        </div>

        {/* Headline P&L */}
        <div className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-navy-dark via-primary/10 to-navy-dark p-6 md:p-8 mb-5 shadow-xl shadow-gold/10">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_85%_15%,hsl(var(--gold)/0.25),transparent_55%)]" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat icon={TrendingUp} label="Profit / Loss" value={gbp(s.net)} accent={s.net >= 0 ? "pos" : "neg"} big />
            <Stat icon={Percent} label="ROI" value={`${s.roi >= 0 ? "+" : ""}${s.roi.toFixed(1)}%`} accent={s.roi >= 0 ? "pos" : "neg"} big />
            <Stat icon={Target} label="Strike rate" value={`${bets.length ? Math.round((s.wins / bets.length) * 100) : 0}%`} sub={`${s.wins}W · ${s.losses}L`} />
            <Stat icon={Flame} label="Streak" value={s.streak ? `${s.sign}${s.streak}` : "—"} sub={`avg odds ${s.avgOdds.toFixed(2)}`} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex gap-1.5">
            {MARKETS.map((m) => (
              <button key={m} onClick={() => setMarket(m)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${m === market ? "bg-gold text-primary-foreground border-gold" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(["7d", "30d", "all"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${p === period ? "bg-primary/15 text-primary border-primary/40" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>
                {p === "all" ? "All time" : p === "30d" ? "30 days" : "7 days"}
              </button>
            ))}
          </div>
        </div>

        {/* Cumulative P&L chart */}
        <div className="rounded-2xl border border-border/50 bg-card/70 p-4 mb-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Running profit (£)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="plFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`£${v.toFixed(2)}`, "Running P&L"]}
                />
                <Area type="monotone" dataKey="pl" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#plFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent results */}
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Results ({recent.length})</p>
        <div className="rounded-2xl border border-border/50 bg-card/70 divide-y divide-border/30 overflow-hidden">
          {recent.map((b) => {
            const won = b.result === "won";
            const primary = b.legs[0];
            return (
              <div key={b.id} className="flex items-center gap-3 px-3 md:px-4 py-3">
                <div className={`w-1.5 h-10 rounded-full ${won ? "bg-success" : "bg-destructive"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {b.type === "double" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-gold/40 text-gold gap-0.5"><Layers className="w-2.5 h-2.5" />Double</Badge>}
                    <span className="font-semibold text-sm text-foreground truncate">
                      {b.type === "double" ? b.legs.map((l) => l.market).join(" + ") : primary.market}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.type === "double" ? `${b.legs.length} legs` : `${primary.home} v ${primary.away}`} · {primary.league} · {b.date}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold tabular-nums ${won ? "text-success" : "text-destructive"}`}>{gbp(b.pl)}</div>
                  <div className="text-[10px] text-muted-foreground">@ {b.odds.toFixed(2)} · £{b.stake}</div>
                </div>
              </div>
            );
          })}
          {recent.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">No picks in this view.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent, big }: { icon: typeof Target; label: string; value: string; sub?: string; accent?: "pos" | "neg"; big?: boolean }) {
  const color = accent === "pos" ? "text-success" : accent === "neg" ? "text-destructive" : "text-foreground";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`font-black tabular-nums ${big ? "text-2xl md:text-3xl" : "text-xl"} ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
