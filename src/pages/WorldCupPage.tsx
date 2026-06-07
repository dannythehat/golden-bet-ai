import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Sparkles, Flame, AlertTriangle, ChevronRight, RefreshCw, Calendar, MapPin, Users } from "lucide-react";
import { WC2026_GROUPS, WC2026_TEAMS, WC2026_DATES, WC2026_HOSTS, getTeam } from "@/data/worldCup2026";
import { useWCContent } from "@/hooks/useWCContent";
import { Paywall } from "@/components/Paywall";
import { InnerCircleFrame } from "@/components/InnerCircleFrame";
import wcHero from "@/assets/wc2026-hero.jpg";


type Section = 'home' | 'pnl' | 'about' | 'blog' | 'over-goals' | 'over-corners' | 'over-cards' | 'bet-builder' | 'acca-delight' | 'members';

export default function WorldCupPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const intro = useWCContent<any>("tournament_intro", "intro");

  useEffect(() => {
    document.title = "World Cup 2026 Hub — Gaffer's Picks, Reviews & Tips | The Footy Oracle";
  }, []);

  // Countdown to WC 2026 kickoff (June 11, 2026)
  const countdown = useMemo(() => {
    const target = new Date("2026-06-11T20:00:00Z").getTime();
    const diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return { d, h, m };
  }, []);


  return (
    <div className="min-h-screen bg-background">


      <Navigation
        activeSection={"home" as Section}
        onSectionChange={(s) => { if (s !== ("world-cup" as any)) navigate("/"); }}
      />

      <main className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        {/* Hero */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-background p-6 md:p-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[260px]">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-6 h-6 text-gold" />
                  <Badge variant="outline" className="border-gold/40 text-gold">FIFA World Cup 2026</Badge>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold mb-3 leading-tight">
                  The Gaffer's <span className="text-primary">World Cup</span> Hub
                </h1>
                <p className="text-sm text-muted-foreground mb-4">
                  {WC2026_DATES} · {WC2026_HOSTS.join(" · ")} · 48 teams · 12 groups
                </p>

                {intro.loading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-2/3" /></div>
                ) : intro.data ? (
                  <div className="space-y-3">
                    <p className="text-base md:text-lg font-semibold text-foreground italic">"{intro.data.hook}"</p>
                    <p className="text-sm text-muted-foreground">{intro.data.intro}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {intro.data.favourites?.map((f: string) => (
                        <Badge key={f} className="bg-gold/20 text-gold border-gold/40"><Flame className="w-3 h-3 mr-1" />{f}</Badge>
                      ))}
                      {intro.data.dark_horse && (
                        <Badge variant="outline" className="border-primary/40 text-primary"><Sparkles className="w-3 h-3 mr-1" />Dark Horse: {intro.data.dark_horse}</Badge>
                      )}
                    </div>
                    {intro.data.wildcard_storyline && (
                      <p className="text-xs text-muted-foreground/80 pt-2"><AlertTriangle className="w-3 h-3 inline mr-1" />{intro.data.wildcard_storyline}</p>
                    )}
                  </div>
                ) : (
                  <Button size="sm" onClick={() => intro.refresh()}>Get the Gaffer's take</Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6 h-auto">
            <TabsTrigger value="overview" className="py-2">Groups</TabsTrigger>
            <TabsTrigger value="teams" className="py-2">Teams (48)</TabsTrigger>
            <TabsTrigger value="tips" className="py-2 gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" /> Tips
            </TabsTrigger>
          </TabsList>

          {/* GROUPS */}
          <TabsContent value="overview" className="space-y-4">
            {selectedGroup ? (
              <GroupDetail group={selectedGroup} onBack={() => setSelectedGroup(null)} onTeam={(c) => { setTab('teams'); setSelectedTeam(c); }} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {WC2026_GROUPS.map(g => (
                  <Card
                    key={g.group}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedGroup(g.group)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg">Group {g.group}</h3>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      {g.teams.map(t => (
                        <div key={t.code} className="flex items-center gap-2 text-sm">
                          <span className="text-base">{t.flag}</span>
                          <span>{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TEAMS */}
          <TabsContent value="teams">
            {selectedTeam ? (
              <TeamDetail code={selectedTeam} onBack={() => setSelectedTeam(null)} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {WC2026_TEAMS.map(t => (
                  <button
                    key={t.code}
                    onClick={() => setSelectedTeam(t.code)}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <span className="text-xl">{t.flag}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">Group {t.group}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TIPS */}
          <TabsContent value="tips" className="space-y-4">
            <TipsTab />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

// ───────────────── Team Detail ─────────────────
function TeamDetail({ code, onBack }: { code: string; onBack: () => void }) {
  const team = getTeam(code);
  const rivals = useMemo(() => team ? WC2026_TEAMS.filter(t => t.group === team.group && t.code !== code).map(t => t.name) : [], [code, team]);
  const { data, loading, error, refresh } = useWCContent<any>("team_review", code, team ? { name: team.name, group: team.group, groupRivals: rivals } : undefined);

  if (!team) return null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{team.flag}</span>
          <div>
            <h2 className="text-2xl font-bold">{team.name}</h2>
            <p className="text-xs text-muted-foreground">Group {team.group} · Pot {team.pot}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={onBack}>Back</Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-20 w-full" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-3">
            <p className="text-sm italic font-semibold">"{data.verdict}"</p>
          </div>
          <p className="text-sm leading-relaxed">{data.summary}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase text-emerald-400 mb-2">Strengths</h4>
              <ul className="text-sm space-y-1">{data.strengths?.map((s: string, i: number) => <li key={i}>· {s}</li>)}</ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-rose-400 mb-2">Weaknesses</h4>
              <ul className="text-sm space-y-1">{data.weaknesses?.map((s: string, i: number) => <li key={i}>· {s}</li>)}</ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="bg-gold/15 text-gold border-gold/40">Title chances: {data.title_chances}</Badge>
            <Badge variant="outline">Dark Horse: {data.dark_horse_rating}/10</Badge>
          </div>

          {data.gaffer_pick && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
              <p className="text-xs font-bold text-gold mb-1">GAFFER'S PICK</p>
              <p className="text-sm">{data.gaffer_pick}</p>
            </div>
          )}
        </div>
      ) : (
        <Button size="sm" onClick={() => refresh()}>Get the Gaffer's review</Button>
      )}
    </Card>
  );
}

// ───────────────── Group Detail ─────────────────
function GroupDetail({ group, onBack, onTeam }: { group: string; onBack: () => void; onTeam: (code: string) => void }) {
  const teams = WC2026_TEAMS.filter(t => t.group === group);
  const { data, loading, refresh } = useWCContent<any>("group_preview", group, { teams: teams.map(t => t.name) });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Group {group}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={onBack}>Back</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mb-5">
        {teams.map(t => (
          <button key={t.code} onClick={() => onTeam(t.code)} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 text-left">
            <span className="text-xl">{t.flag}</span>
            <span className="text-sm font-medium">{t.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-24 w-full" /></div>
      ) : data ? (
        <div className="space-y-4">
          <p className="text-base font-semibold italic">"{data.headline}"</p>
          <p className="text-sm leading-relaxed">{data.preview}</p>

          {data.predicted_order && (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Gaffer's Predicted Finish</h4>
              <ol className="space-y-1">
                {data.predicted_order.map((name: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold ${i < 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                    {name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {data.banker_pick && (
            <InnerCircleFrame>
              <div className="rounded-lg border border-gold/30 bg-gold/5 p-3">
                <p className="text-xs font-bold text-gold mb-1">BANKER PICK</p>
                <p className="text-sm">{data.banker_pick}</p>
              </div>
            </InnerCircleFrame>
          )}

          {data.upset_warning && (
            <div className="rounded-lg border border-amber/30 bg-amber/5 p-3">
              <p className="text-xs font-bold text-amber mb-1">UPSET WATCH</p>
              <p className="text-sm">{data.upset_warning}</p>
            </div>
          )}
        </div>
      ) : (
        <Button size="sm" onClick={() => refresh()}>Get group preview</Button>
      )}
    </Card>
  );
}

// ───────────────── Tips Tab ─────────────────
function TipsTab() {
  // Pick a curated set of marquee group-stage fixtures as launch tips
  const marquee = [
    { id: "BRA-MAR", home: "Brazil", away: "Morocco", group: "C", date: "Group Stage" },
    { id: "FRA-NOR", home: "France", away: "Norway", group: "I", date: "Group Stage" },
    { id: "ARG-ALG", home: "Argentina", away: "Algeria", group: "J", date: "Group Stage" },
    { id: "ENG-CRO", home: "England", away: "Croatia", group: "L", date: "Group Stage" },
    { id: "ESP-URU", home: "Spain", away: "Uruguay", group: "H", date: "Group Stage" },
    { id: "GER-CIV", home: "Germany", away: "Ivory Coast", group: "E", date: "Group Stage" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Marquee group-stage fixtures with the Gaffer's tip. New picks drop daily once the tournament kicks off — keep checking back.
      </p>
      {marquee.map((m, i) => (
        <MatchTipCard key={m.id} {...m} gated={i >= 2} />
      ))}
    </div>
  );
}

function MatchTipCard({ id, home, away, group, date, gated }: { id: string; home: string; away: string; group: string; date: string; gated: boolean }) {
  const { data, loading, refresh } = useWCContent<any>("match_tip", id, { home, away, group, date });

  const body = (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">Group {group} · {date}</p>
          <h3 className="font-bold text-base">{home} vs {away}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && !data ? (
        <Skeleton className="h-24 w-full" />
      ) : data ? (
        <div className="space-y-3">
          <p className="text-sm italic font-semibold">"{data.verdict}"</p>

          {data.main_tip && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Main Tip</p>
                <p className="font-bold">{data.main_tip.selection}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">~{data.main_tip.odds_estimate}</p>
                <p className="text-xs">{data.main_tip.stake_units}u stake</p>
              </div>
            </div>
          )}

          {data.value_tip && (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gold">Value Tip</p>
                <p className="font-semibold">{data.value_tip.selection}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">~{data.value_tip.odds_estimate}</p>
                <p className="text-xs">{data.value_tip.stake_units}u stake</p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">{data.reasoning}</p>

          <div className="flex items-center justify-between text-xs">
            <Badge variant="outline">Confidence: {data.confidence}/10</Badge>
            {data.avoid && <span className="text-muted-foreground">Avoid: {data.avoid}</span>}
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => refresh()}>Get the Gaffer's tip</Button>
      )}
    </Card>
  );

  if (!gated) return body;
  return (
    <Paywall title="Inner Circle Tip" message="Members get every Gaffer World Cup tip. £3/mo keeps you in the loop.">
      {body}
    </Paywall>
  );
}
