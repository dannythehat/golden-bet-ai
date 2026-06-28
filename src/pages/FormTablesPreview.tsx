import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Flag, Target, CreditCard, Repeat, Info, TrendingUp } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TeamAvatar } from "@/components/TeamAvatar";
import { FormStrip } from "@/components/FormStrip";
import snapshot from "@/data/formTablesSnapshot.json";

interface Game { date: string; opp: string; ha: string; gf: number; ga: number; result: string; goals: number; corners: number; cards: number; btts: boolean }
interface Team {
  team: string; played: number; avgGoals: number; avgCorners: number; avgCards: number;
  bttsHit: number; formStr: string; markets: Record<string, number>; last8: Game[];
}
const DATA = snapshot as { league: string; country: string; flag: string; season: string; window: number; teams: Team[] };

type CatKey = "Corners" | "Goals" | "Cards" | "BTTS";
const CATS: Record<CatKey, { icon: typeof Flag; thresholds: number[]; stat: "corners" | "goals" | "cards" | "btts"; avgKey: "avgCorners" | "avgGoals" | "avgCards"; unit: string }> = {
  Corners: { icon: Flag, thresholds: [8.5, 9.5, 10.5, 11.5, 12.5], stat: "corners", avgKey: "avgCorners", unit: "corners" },
  Goals: { icon: Target, thresholds: [2.5, 3.5, 4.5, 5.5], stat: "goals", avgKey: "avgGoals", unit: "goals" },
  Cards: { icon: CreditCard, thresholds: [3.5, 4.5, 5.5, 6.5], stat: "cards", avgKey: "avgCards", unit: "cards" },
  BTTS: { icon: Repeat, thresholds: [], stat: "btts", avgKey: "avgGoals", unit: "goals" },
};
const heat = (pct: number) => `hsl(${110 + pct * 0.2}, ${40 + pct * 0.35}%, ${88 - pct * 0.28}%)`;
const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

export default function FormTablesPreview() {
  const [cat, setCat] = useState<CatKey>("Corners");
  const [thr, setThr] = useState<number>(9.5);
  const [open, setOpen] = useState<string | null>(null);

  const conf = CATS[cat];
  const marketKey = cat === "BTTS" ? "BTTS" : `Over ${thr} ${cat}`;
  const N = DATA.window;

  const rows = useMemo(() =>
    DATA.teams.map((t) => ({ t, hit: t.markets[marketKey] ?? 0, avg: t[conf.avgKey] as number }))
      .sort((a, b) => b.hit - a.hit || b.avg - a.avg),
  [marketKey, conf.avgKey]);

  const selCat = (c: CatKey) => {
    setCat(c); setOpen(null);
    if (c !== "BTTS") setThr(CATS[c].thresholds.includes(thr) ? thr : CATS[c].thresholds[1] ?? CATS[c].thresholds[0]);
  };

  const gameStat = (g: Game) => cat === "BTTS" ? (g.btts ? "Yes" : "No") : String(g[conf.stat as "corners" | "goals" | "cards"]);
  const gameHit = (g: Game) => cat === "BTTS" ? g.btts : (g[conf.stat as "corners" | "goals" | "cards"] as number) > thr;

  return (
    <div className="min-h-screen bg-background sparkle-bg flex flex-col">
      <Navigation activeSection="home" onSectionChange={() => {}} />
      <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16 flex-1 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        {/* League header */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl leading-none">{DATA.flag}</span>
          <div>
            <h1 className="text-2xl md:text-3xl font-black">{DATA.league} <span className="text-gold">Form</span></h1>
            <p className="text-xs text-muted-foreground">{DATA.country} · {DATA.season} · ranked on the last {N} games</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 my-4 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <span>Preview on real Premier League data. Live version adds crests, kickoff times & ~28 leagues once the season's on.</span>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(CATS) as CatKey[]).map((c) => {
            const Icon = CATS[c].icon; const active = c === cat;
            return (
              <button key={c} onClick={() => selCat(c)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-all ${active ? "bg-gold text-primary-foreground border-gold shadow-md shadow-gold/20" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-gold/40"}`}>
                <Icon className="h-3.5 w-3.5" /> {c}
              </button>
            );
          })}
        </div>
        {cat !== "BTTS" && (
          <div className="flex flex-wrap gap-2 mb-5">
            {conf.thresholds.map((t) => (
              <button key={t} onClick={() => { setThr(t); setOpen(null); }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-all ${t === thr ? "bg-primary/15 text-primary border-primary/40" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
                Over {t}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-border/50 bg-card/70 overflow-hidden">
          <div className="grid grid-cols-[2rem_1fr_5rem_3.5rem] md:grid-cols-[2.5rem_1fr_4.5rem_8rem_4rem] items-center gap-2 px-3 md:px-4 py-2.5 border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>#</span><span>Team</span>
            <span className="hidden md:block">Form</span>
            <span className="text-center">Hit</span>
            <span className="text-right">Avg</span>
          </div>

          {rows.map((r, i) => {
            const pct = Math.round((r.hit / N) * 100);
            const isOpen = open === r.t.team;
            return (
              <div key={r.t.team} className="border-b border-border/30 last:border-0">
                <button onClick={() => setOpen(isOpen ? null : r.t.team)}
                  className="w-full grid grid-cols-[2rem_1fr_5rem_3.5rem] md:grid-cols-[2.5rem_1fr_4.5rem_8rem_4rem] items-center gap-2 px-3 md:px-4 py-2.5 text-left hover:bg-muted/30 transition-colors">
                  <span className={`text-sm font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span className="flex items-center gap-2.5 min-w-0">
                    <TeamAvatar name={r.t.team} size={28} />
                    <span className="font-semibold text-foreground truncate">{r.t.team}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                  <span className="hidden md:block"><FormStrip form={r.t.formStr} /></span>
                  <span className="flex items-center justify-center gap-2">
                    <span className="hidden md:block h-2 w-14 rounded-full bg-muted overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: heat(pct) }} />
                    </span>
                    <span className="text-sm font-bold tabular-nums w-9 text-center">{r.hit}/{N}</span>
                  </span>
                  <span className="text-right text-sm font-semibold tabular-nums text-foreground">{r.avg}</span>
                </button>

                {/* FlashScore-style drill-down */}
                {isOpen && (
                  <div className="px-3 md:px-4 pb-4 pt-1 bg-muted/10">
                    {/* Team header */}
                    <div className="flex items-center gap-3 py-3">
                      <TeamAvatar name={r.t.team} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground">{r.t.team}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <FormStrip form={r.t.formStr} size="md" />
                          <span className="text-[11px] text-muted-foreground">#{i + 1} for {marketKey}</span>
                        </div>
                      </div>
                    </div>

                    {/* Market summary tiles */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { l: marketKey, v: `${pct}%`, s: `${r.hit}/${N} games` },
                        { l: `Avg ${conf.unit}`, v: String(r.avg), s: "per game" },
                        { l: "Table rank", v: `#${i + 1}`, s: `of ${rows.length}` },
                      ].map((s) => (
                        <div key={s.l} className="rounded-xl border border-border/40 bg-card/60 p-2.5 text-center">
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">{s.l}</div>
                          <div className="text-lg font-black text-foreground tabular-nums">{s.v}</div>
                          <div className="text-[10px] text-muted-foreground">{s.s}</div>
                        </div>
                      ))}
                    </div>

                    {/* Last matches (FlashScore-inspired) */}
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Last {N} matches
                    </p>
                    <div className="rounded-xl border border-border/40 bg-card/60 divide-y divide-border/30 overflow-hidden">
                      {r.t.last8.map((g, gi) => {
                        const hit = gameHit(g);
                        return (
                          <div key={gi} className="flex items-center gap-2 px-2.5 py-2 text-sm">
                            <span className="text-[11px] text-muted-foreground w-10 shrink-0">{dmy(g.date)}</span>
                            <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0">{g.ha}</span>
                            <TeamAvatar name={g.opp} size={20} />
                            <span className="flex-1 min-w-0 truncate text-foreground/90">{g.opp}</span>
                            <span className="font-bold tabular-nums text-foreground">{g.gf}–{g.ga}</span>
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${g.result === "W" ? "bg-success" : g.result === "D" ? "bg-amber-500" : "bg-destructive"}`}>{g.result}</span>
                            <span className={`w-12 text-right text-xs font-semibold tabular-nums ${hit ? "text-success" : "text-muted-foreground"}`}>
                              {gameStat(g)}{cat !== "BTTS" ? ` ${conf.unit[0]}` : ""} {hit ? "✓" : "✗"}
                            </span>
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
          Tap any team for their last {N} matches, form and how they rank. Crests & kickoff times arrive with the live data.
        </p>
      </main>
      <Footer />
    </div>
  );
}
