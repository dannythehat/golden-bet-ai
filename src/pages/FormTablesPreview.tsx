import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Flag, Target, CreditCard, Repeat, Info } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import snapshot from "@/data/formTablesSnapshot.json";

type Team = {
  team: string;
  played: number;
  avgGoals: number; avgCorners: number; avgCards: number; bttsHit: number;
  markets: Record<string, number>;
  last8: { date: string; opp: string; ha: string; goals: number; corners: number; cards: number; btts: boolean }[];
};
const DATA = snapshot as { league: string; season: string; window: number; note: string; teams: Team[] };

type CatKey = "Corners" | "Goals" | "Cards" | "BTTS";
const CATS: Record<CatKey, { icon: typeof Flag; thresholds: number[]; stat: "corners" | "goals" | "cards" | "btts"; avgKey: "avgCorners" | "avgGoals" | "avgCards"; unit: string }> = {
  Corners: { icon: Flag, thresholds: [8.5, 9.5, 10.5, 11.5, 12.5], stat: "corners", avgKey: "avgCorners", unit: "corners" },
  Goals: { icon: Target, thresholds: [2.5, 3.5, 4.5, 5.5], stat: "goals", avgKey: "avgGoals", unit: "goals" },
  Cards: { icon: CreditCard, thresholds: [3.5, 4.5, 5.5, 6.5], stat: "cards", avgKey: "avgCards", unit: "cards" },
  BTTS: { icon: Repeat, thresholds: [], stat: "btts", avgKey: "avgGoals", unit: "goals" },
};

function heat(pct: number) {
  // green heat like the stats sites; stronger = greener
  return `hsl(${110 + pct * 0.2}, ${40 + pct * 0.35}%, ${88 - pct * 0.28}%)`;
}

export default function FormTablesPreview() {
  const [cat, setCat] = useState<CatKey>("Corners");
  const [thr, setThr] = useState<number>(9.5);
  const [open, setOpen] = useState<string | null>(null);

  const conf = CATS[cat];
  const marketKey = cat === "BTTS" ? "BTTS" : `Over ${thr} ${cat}`;
  const N = DATA.window;

  const rows = useMemo(() => {
    return DATA.teams
      .map((t) => ({ t, hit: t.markets[marketKey] ?? 0, avg: t[conf.avgKey] as number }))
      .sort((a, b) => b.hit - a.hit || b.avg - a.avg);
  }, [marketKey, conf.avgKey]);

  const selCat = (c: CatKey) => {
    setCat(c); setOpen(null);
    if (c !== "BTTS") setThr(CATS[c].thresholds.includes(thr) ? thr : CATS[c].thresholds[1] ?? CATS[c].thresholds[0]);
  };

  return (
    <div className="min-h-screen bg-background sparkle-bg flex flex-col">
      <Navigation activeSection="home" onSectionChange={() => {}} />
      <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16 flex-1 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        {/* Header */}
        <div className="space-y-1 mb-5">
          <h1 className="text-3xl md:text-4xl font-black">Form <span className="text-gold">Tables</span></h1>
          <p className="text-sm text-muted-foreground">
            {DATA.league} · {DATA.season} · ranked on the <span className="text-foreground font-semibold">last {N} games</span>
          </p>
        </div>

        {/* Preview notice */}
        <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 mb-5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <span>Preview on real Premier League data. The live version updates daily across ~28 leagues once the season's underway.</span>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(CATS) as CatKey[]).map((c) => {
            const Icon = CATS[c].icon;
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => selCat(c)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-all ${
                  active ? "bg-gold text-primary-foreground border-gold shadow-md shadow-gold/20"
                         : "border-border/60 text-muted-foreground hover:text-foreground hover:border-gold/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {c}
              </button>
            );
          })}
        </div>

        {/* Threshold pills */}
        {cat !== "BTTS" && (
          <div className="flex flex-wrap gap-2 mb-5">
            {conf.thresholds.map((t) => (
              <button
                key={t}
                onClick={() => { setThr(t); setOpen(null); }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-all ${
                  t === thr ? "bg-primary/15 text-primary border-primary/40"
                            : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                Over {t}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-border/50 bg-card/70 overflow-hidden">
          <div className="grid grid-cols-[2.5rem_1fr_6.5rem_5rem] md:grid-cols-[3rem_1fr_9rem_6rem] items-center gap-2 px-3 md:px-4 py-2.5 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>#</span>
            <span>Team</span>
            <span className="text-center">Hit rate</span>
            <span className="text-right">Avg/match</span>
          </div>

          {rows.map((r, i) => {
            const pct = Math.round((r.hit / N) * 100);
            const isOpen = open === r.t.team;
            return (
              <div key={r.t.team} className="border-b border-border/30 last:border-0">
                <button
                  onClick={() => setOpen(isOpen ? null : r.t.team)}
                  className="w-full grid grid-cols-[2.5rem_1fr_6.5rem_5rem] md:grid-cols-[3rem_1fr_9rem_6rem] items-center gap-2 px-3 md:px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className={`text-sm font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{r.t.team}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                  <span className="flex items-center justify-center gap-2">
                    <span className="hidden md:block h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: heat(pct) }} />
                    </span>
                    <span className="text-sm font-bold tabular-nums w-9 text-center" style={{ color: pct >= 50 ? undefined : "hsl(var(--muted-foreground))" }}>
                      {r.hit}/{N}
                    </span>
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-foreground">{r.avg}</span>
                </button>

                {/* Drill-down: last 8 games */}
                {isOpen && (
                  <div className="px-3 md:px-4 pb-3 -mt-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Last {N} games · {cat === "BTTS" ? "both teams scored" : `${conf.unit} total`}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {r.t.last8.map((g, gi) => {
                        const val = cat === "BTTS" ? (g.btts ? "Yes" : "No") : String(g[conf.stat as "corners" | "goals" | "cards"]);
                        const hit = cat === "BTTS" ? g.btts : (g[conf.stat as "corners" | "goals" | "cards"] as number) > thr;
                        return (
                          <div key={gi} className={`rounded-lg border px-2 py-1.5 text-xs ${hit ? "border-success/30 bg-success/5" : "border-border/40 bg-muted/20"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground truncate">{g.ha} {g.opp}</span>
                              <span className={`font-bold tabular-nums ${hit ? "text-success" : "text-muted-foreground"}`}>{val}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Click any team to see their last {N} games. Hit rate = how often they went over the line; average is the "why".
        </p>
      </main>
      <Footer />
    </div>
  );
}
