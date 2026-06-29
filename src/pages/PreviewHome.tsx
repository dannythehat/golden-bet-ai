import { Link } from "react-router-dom";
import {
  Trophy, Crown, Gift, Smartphone, Coffee, Shirt, Flame, Newspaper, Users,
  Facebook, Send, Sparkles, ArrowRight, Check, Flag, Target, CreditCard,
  TrendingUp, Plane, Star,
} from "lucide-react";

const gaffer = "/images/the-gaffer.png";
const gaffer2 = "/images/the-gaffer-2.png";

/* ============================================================================
 * MOCKUP — "the dream page" for the Footy Oracle Club rebrand.
 * Self-contained, purple + gold, witty. Lives at /preview so the live site
 * is untouched. Sample content throughout.
 * ========================================================================== */

const PURPLE_BG = "bg-[#160a2b]";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 shadow-lg shadow-purple-900/40">
        <Crown className="absolute -top-1.5 h-3 w-3 text-gold" />
        <span className="text-lg">⚽</span>
      </span>
      <span className="leading-none">
        <span className="block font-black tracking-tight text-white">FOOTY ORACLE</span>
        <span className="block text-[10px] font-bold tracking-[0.35em] text-gold">— CLUB —</span>
      </span>
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-white/80">{children}</span>;
}

export default function PreviewHome() {
  return (
    <div className={`min-h-screen ${PURPLE_BG} text-white overflow-x-hidden`}>
      {/* Announcement bar */}
      <div className="bg-gradient-to-r from-gold-dark via-gold to-gold-glow text-[#160a2b] text-center text-xs md:text-sm font-bold py-2 px-4">
        🏆 The Premier League season kicks off in August — reserve your place before the whistle.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#160a2b]/80 border-b border-white/10">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-white/70">
            {["Tips", "Form Tables", "Fixtures", "P&L", "The Gaffer", "Club"].map((n) => (
              <span key={n} className="hover:text-white cursor-pointer transition-colors">{n}</span>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden sm:inline-flex rounded-lg border border-white/20 px-4 py-1.5 text-sm font-semibold hover:bg-white/5">Login</button>
            <button className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-700 px-4 py-1.5 text-sm font-bold shadow-lg shadow-purple-900/40 hover:scale-[1.03] transition-transform">Join the Club</button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.35),transparent_45%),radial-gradient(circle_at_85%_60%,rgba(168,85,247,0.3),transparent_45%)]" />
        <div className="relative container mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-8 grid lg:grid-cols-2 gap-8 items-center">
          {/* Left */}
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Coming soon · 2025/26
            </span>
            <h1 className="text-4xl md:text-6xl font-black leading-[0.95] tracking-tight">
              The Footy Oracle<br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-gold bg-clip-text text-transparent">Fantasy League</span>
            </h1>
            <p className="text-2xl md:text-3xl font-black text-gold italic">Beat the Gaffer. Win big.</p>
            <p className="text-white/80 max-w-lg">
              Daily tips, form tables that actually mean something, weekly prizes, and a Gaffer who tells it straight.
              Join hundreds of managers for the best season of your life.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-md text-sm">
              {["Daily Gaffer reports", "Weekly prizes & awards", "Beat the Gaffer", "Christmas Challenge", "Luxury holiday prize", "An epic community"].map((f) => (
                <span key={f} className="flex items-center gap-2 text-white/85"><Check className="h-4 w-4 text-gold shrink-0" />{f}</span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow text-[#160a2b] px-6 py-3 font-black shadow-lg shadow-gold/20 hover:scale-[1.03] transition-transform">
                Grab your place now <ArrowRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3 font-bold hover:bg-white/5">Read more</button>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex -space-x-2">
                {["a", "b", "c", "d"].map((s, i) => (<span key={s} className="h-7 w-7 rounded-full border-2 border-[#160a2b]" style={{ background: `hsl(${265 + i * 12} 50% 45%)` }} />))}
              </div>
              <p className="text-sm text-white/70"><span className="font-black text-white">285+</span> managers already in. <span className="text-gold">And counting…</span></p>
            </div>
          </div>

          {/* Right — the Gaffer */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-purple-600/30 to-gold/20 blur-2xl" />
            <div className="relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-purple-900/50">
              <img src={gaffer} alt="The Gaffer" className="w-full h-[360px] md:h-[440px] object-cover" style={{ objectPosition: "55% 18%" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#160a2b] via-transparent to-transparent" />
              <div className="absolute top-4 right-4 rounded-lg bg-purple-500/20 backdrop-blur px-3 py-1.5 border border-purple-300/30">
                <p className="text-[11px] font-black uppercase tracking-widest text-purple-200" style={{ textShadow: "0 0 12px rgba(196,150,255,0.8)" }}>Trust the Gaffer</p>
              </div>
              <div className="absolute bottom-4 left-4 rounded-lg bg-black/50 backdrop-blur px-3 py-2 border border-white/10">
                <p className="text-sm font-bold italic">"I don't get lucky. <span className="text-gold">I get results.</span>"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURE STRIP ===== */}
      <section className="bg-white text-[#160a2b]">
        <div className="container mx-auto px-4 md:px-6 py-5 grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { i: Newspaper, t: "Daily Gaffer Reports", s: "Tips, banter, transfer talk" },
            { i: Trophy, t: "Weekly Prizes", s: "New prizes every week" },
            { i: Flag, t: "Form Tables", s: "Numbers that mean something" },
            { i: Plane, t: "Win a Holiday", s: "End-of-season jackpot" },
            { i: Users, t: "Epic Community", s: "Nobody's anonymous" },
            { i: TrendingUp, t: "Beat the Gaffer", s: "Can you outsmart him?" },
          ].map(({ i: Icon, t, s }) => (
            <div key={t} className="flex flex-col items-center text-center gap-1">
              <Icon className="h-6 w-6 text-purple-700" />
              <p className="text-sm font-black leading-tight">{t}</p>
              <p className="text-[11px] text-[#160a2b]/60">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== TODAY: value tip + form teaser ===== */}
      <section className="container mx-auto px-4 md:px-6 py-12 grid lg:grid-cols-2 gap-6">
        {/* Banker of the day */}
        <div className="rounded-3xl border border-gold/30 bg-gradient-to-br from-[#241141] to-[#160a2b] p-6 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-gold text-[#160a2b] text-[10px] font-black uppercase tracking-wider px-2.5 py-1">Banker of the day</span>
            <span className="text-xs text-white/50">The Gaffer's sharpest call</span>
          </div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-lg bg-violet-700 grid place-items-center font-black text-sm">MC</span>
              <span className="font-bold">Man City</span>
            </div>
            <span className="text-white/40 text-sm font-semibold">v</span>
            <div className="flex items-center gap-2">
              <span className="font-bold">Chelsea</span>
              <span className="h-9 w-9 rounded-lg bg-blue-700 grid place-items-center font-black text-sm">CH</span>
            </div>
          </div>
          <div className="rounded-2xl bg-black/30 border border-white/10 p-4 mb-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-black text-gold"><Flag className="h-4 w-4" /> Over 9.5 Corners</span>
              <span className="text-2xl font-black text-white">1.65</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="rounded bg-success/20 text-success font-bold px-2 py-0.5">+22 value</span>
              <span className="text-white/60">form says 83% · bookies pricing 60%</span>
            </div>
          </div>
          <p className="text-sm text-white/80 italic">"Both these mobs live on the wings — 8 of City's last 10 sailed over. Bookies are asleep at 1.65. That's value, not a hope. £10 on it."</p>
        </div>

        {/* Form table teaser */}
        <div className="rounded-3xl border border-white/10 bg-[#1c0f38] p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-lg">The numbers don't lie</h3>
            <span className="text-xs text-gold font-semibold flex items-center gap-1 cursor-pointer">Full tables <ArrowRight className="h-3 w-3" /></span>
          </div>
          <p className="text-xs text-white/50 mb-3">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League · Over 9.5 corners · last 8</p>
          <div className="space-y-1.5">
            {[["1", "Man City", "8/8", "13.5"], ["2", "Leeds", "6/8", "11.6"], ["3", "Aston Villa", "6/8", "10.5"], ["4", "Brighton", "6/8", "10.4"]].map(([r, t, h, a], i) => (
              <div key={t} className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2">
                <span className={`text-sm font-black w-4 ${i < 3 ? "text-gold" : "text-white/40"}`}>{r}</span>
                <span className="h-7 w-7 rounded-md grid place-items-center text-[10px] font-black" style={{ background: `hsl(${260 + i * 20} 45% 40%)` }}>{(t as string).slice(0, 2).toUpperCase()}</span>
                <span className="flex-1 font-semibold text-sm">{t}</span>
                <span className="text-sm font-bold tabular-nums">{h}</span>
                <span className="text-sm text-white/60 tabular-nums w-10 text-right">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRIZES ===== */}
      <section className="container mx-auto px-4 md:px-6 py-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-black">Epic prizes. <span className="text-gold">Unforgettable season.</span></h2>
          <p className="text-white/60 mt-1">More prizes than ever — every week, every month, all season.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { i: Plane, tag: "Main prize", t: "Luxury Holiday", s: "5★ getaway for two", big: true },
            { i: Gift, tag: "Christmas special", t: "Epic Hampers", s: "Festive haul for the top managers" },
            { i: Smartphone, tag: "Weekly winner", t: "Premium Tech", s: "Big prizes every single week" },
            { i: Coffee, tag: "Monday Tea Award", t: "Breakfast on the Gaffer", s: "Banter and a bacon sarnie" },
            { i: Shirt, tag: "Monthly award", t: "Signed Shirts", s: "Exclusive prizes all season" },
            { i: Crown, tag: "Season awards", t: "Glory & Bragging Rights", s: "Trophies and legend status" },
          ].map(({ i: Icon, tag, t, s, big }) => (
            <div key={t} className={`rounded-2xl border p-5 relative overflow-hidden ${big ? "border-gold/50 bg-gradient-to-br from-gold/15 to-[#1c0f38] sm:col-span-2 lg:col-span-1" : "border-white/10 bg-[#1c0f38]"}`}>
              <div className="absolute -bottom-6 -right-6 opacity-10"><Icon className="h-28 w-28" /></div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gold">{tag}</span>
              <div className="my-2"><Icon className={`h-8 w-8 ${big ? "text-gold" : "text-purple-300"}`} /></div>
              <h3 className="font-black text-lg">{t}</h3>
              <p className="text-sm text-white/60">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== DAILY GAFFER + COMMUNITY ===== */}
      <section className="container mx-auto px-4 md:px-6 py-12 grid lg:grid-cols-[1.2fr_1fr] gap-6 items-stretch">
        <div className="rounded-3xl overflow-hidden border border-white/10 relative">
          <img src={gaffer2} alt="The Gaffer" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="relative bg-gradient-to-r from-[#160a2b]/95 to-[#160a2b]/60 p-6 md:p-8 h-full flex flex-col justify-center">
            <span className="text-xs font-black uppercase tracking-wider text-gold flex items-center gap-1.5"><Newspaper className="h-3.5 w-3.5" /> Every morning</span>
            <h2 className="text-2xl md:text-3xl font-black mt-1">What's the Gaffer said this morning?</h2>
            <p className="text-white/75 mt-2 max-w-md">A fresh word from the boss every single day — who's hot, who's a donkey, today's value, and a bit of banter to start your morning right.</p>
            <button className="mt-4 inline-flex items-center gap-2 self-start rounded-xl bg-white/10 border border-white/20 px-5 py-2.5 font-bold hover:bg-white/15">
              Read today's report <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#1c0f38] p-6 flex flex-col justify-center gap-4">
          <h3 className="font-black text-xl flex items-center gap-2"><Users className="h-5 w-5 text-gold" /> Join the banter</h3>
          <p className="text-sm text-white/70">The Club lives in the group chat. Daily posts, results, wind-ups and the Gaffer in the thick of it.</p>
          <a className="flex items-center gap-3 rounded-xl bg-[#1877F2]/15 border border-[#1877F2]/40 px-4 py-3 hover:bg-[#1877F2]/25 transition-colors cursor-pointer">
            <Facebook className="h-5 w-5 text-[#5b9bff]" /><span className="font-bold">Facebook community</span><ArrowRight className="h-4 w-4 ml-auto text-white/50" />
          </a>
          <a className="flex items-center gap-3 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/40 px-4 py-3 hover:bg-[#229ED9]/25 transition-colors cursor-pointer">
            <Send className="h-5 w-5 text-[#5cc8f5]" /><span className="font-bold">Telegram channel</span><ArrowRight className="h-4 w-4 ml-auto text-white/50" />
          </a>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative">
        <div className="container mx-auto px-4 md:px-6 pb-12">
          <div className="rounded-3xl bg-gradient-to-r from-violet-700 via-purple-700 to-violet-800 p-8 md:p-12 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_0%,rgba(255,215,120,0.35),transparent_55%)]" />
            <div className="relative space-y-4 max-w-2xl mx-auto">
              <Flame className="h-9 w-9 text-gold mx-auto" />
              <h2 className="text-3xl md:text-4xl font-black">The season starts in August. Don't be the one who missed out.</h2>
              <p className="text-white/80">Reserve your place now — free — and be first in when the Fantasy League opens.</p>
              <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow text-[#160a2b] px-8 py-3.5 font-black text-lg shadow-xl shadow-gold/20 hover:scale-[1.03] transition-transform">
                Reserve your place <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-xs text-white/60">285+ already in · no payment until the season kicks off</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        <p>The Footy Oracle Club · Built by football fans, for football fans · He doesn't get lucky — he gets results.</p>
        <p className="mt-1 text-white/30">Preview mockup · not the live site</p>
      </footer>
    </div>
  );
}
