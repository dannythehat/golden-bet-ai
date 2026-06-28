import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, Clock, Info, Sparkles } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TeamAvatar } from "@/components/TeamAvatar";
import { FormStrip } from "@/components/FormStrip";
import { todaysFixturesSample, type Fixture } from "@/data/todaysFixturesSample";
import { marketSignals, bestValue } from "@/lib/fixtureValue";

function FixtureRow({ fx, open, onToggle }: { fx: Fixture; open: boolean; onToggle: () => void }) {
  const value = bestValue(fx);
  const signals = marketSignals(fx);
  return (
    <div className="border-b border-border/30 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 md:px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-1 text-xs text-muted-foreground w-12 shrink-0">
          <Clock className="h-3 w-3" />{fx.kickoff}
        </span>
        {/* Teams */}
        <span className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="flex items-center gap-2 min-w-0 justify-end text-right">
            <span className="min-w-0">
              <span className="font-semibold text-foreground truncate block">{fx.home.name}</span>
              <span className="flex justify-end mt-0.5"><FormStrip form={fx.home.formStr} /></span>
            </span>
            <TeamAvatar name={fx.home.name} size={26} />
          </span>
          <span className="text-[11px] text-muted-foreground font-semibold px-1">v</span>
          <span className="flex items-center gap-2 min-w-0">
            <TeamAvatar name={fx.away.name} size={26} />
            <span className="min-w-0">
              <span className="font-semibold text-foreground truncate block">{fx.away.name}</span>
              <span className="flex mt-0.5"><FormStrip form={fx.away.formStr} /></span>
            </span>
          </span>
        </span>
        {/* Gaffer's eye */}
        <span className="shrink-0 flex items-center gap-1.5">
          {value ? (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gold/15 border border-gold/40 px-2 py-0.5 text-[10px] font-bold text-gold">
              <Sparkles className="h-3 w-3" /> +{value.edge}
            </span>
          ) : null}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="px-3 md:px-4 pb-4 pt-1 bg-muted/10">
          {/* Gaffer's verdict */}
          <div className={`rounded-xl border p-3 mb-3 text-sm ${value ? "border-gold/40 bg-gold/5" : "border-border/40 bg-card/50"}`}>
            {value ? (
              <p className="text-foreground/90">
                <span className="font-bold text-gold">The Gaffer's eye: {value.market}.</span>{" "}
                Both strong ({value.homePct}% / {value.awayPct}% last 10) — bookies have it at {value.odds.toFixed(2)} ({value.impliedProb}%),
                my read is {value.formProb}%. <span className="font-semibold text-success">{value.edge} points of value.</span>
              </p>
            ) : (
              <p className="text-muted-foreground">No clear value here — the Gaffer passes. Strong stats alone aren't enough; the price has to be wrong.</p>
            )}
          </div>

          {/* Market comparison */}
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Market read (last 10 form vs price)</p>
          <div className="rounded-xl border border-border/40 bg-card/60 divide-y divide-border/30 overflow-hidden">
            {signals.map((s) => (
              <div key={s.market} className={`px-3 py-2.5 ${s.isValue ? "bg-gold/5" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{s.market}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">@ {s.odds.toFixed(2)}</span>
                    <span className={`font-bold ${s.isValue ? "text-success" : "text-muted-foreground"}`}>
                      {s.edge >= 0 ? "+" : ""}{s.edge} {s.isValue && "✓ VALUE"}
                    </span>
                  </span>
                </div>
                {/* home vs away mini-bars */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-9 tabular-nums text-right">{s.homePct}%</span>
                  <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex">
                    <span className="h-full bg-primary/60" style={{ width: `${s.homePct / 2}%` }} />
                    <span className="h-full bg-gold/60 ml-auto" style={{ width: `${s.awayPct / 2}%` }} />
                  </span>
                  <span className="w-9 tabular-nums">{s.awayPct}%</span>
                  <span className="w-20 text-right">form {s.formProb}% · imp {s.impliedProb}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TodaysFixtures() {
  const [open, setOpen] = useState<number | null>(null);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-background sparkle-bg flex flex-col">
      <Navigation activeSection="home" onSectionChange={() => {}} />
      <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16 flex-1 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div className="mb-1">
          <h1 className="text-2xl md:text-3xl font-black">Today's <span className="text-gold">Fixtures</span></h1>
          <p className="text-xs text-muted-foreground">{today} · form, prices & where the Gaffer sees value</p>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 my-4 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-gold shrink-0 mt-0.5" />
          <span>Preview with sample fixtures. Live version pulls real kickoff times, crests & odds, and flags the Gaffer's value plays automatically.</span>
        </div>

        <div className="space-y-5">
          {todaysFixturesSample.map((lg) => (
            <div key={lg.league}>
              <div className="flex items-center gap-2 px-1 mb-2">
                <span className="text-lg leading-none">{lg.flag}</span>
                <span className="text-sm font-bold text-foreground">{lg.league}</span>
                <span className="text-xs text-muted-foreground">· {lg.country}</span>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/70 overflow-hidden">
                {lg.fixtures.map((fx) => (
                  <FixtureRow key={fx.id} fx={fx} open={open === fx.id} onToggle={() => setOpen(open === fx.id ? null : fx.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-5 text-center">
          The Gaffer scans every game like this, then backs the best 1–2 value plays of the day.
        </p>
      </main>
      <Footer />
    </div>
  );
}
