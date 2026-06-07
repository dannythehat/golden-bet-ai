import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Trophy, Ticket, Sparkles, ArrowLeft, Check, Goal, Crown, Medal } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const signupSchema = z.object({
  display_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
  email: z.string().trim().email('Enter a valid email').max(255),
});

const TOTAL_SPOTS = 48;

const prizes = [
  { icon: Crown, label: '1st Place', amount: '£200', tone: 'from-gold via-gold-glow to-gold-dark text-primary-foreground' },
  { icon: Medal, label: '2nd Place', amount: '£100', tone: 'from-slate-300 to-slate-500 text-primary-foreground' },
  { icon: Medal, label: '3rd Place', amount: '£50',  tone: 'from-amber-700 to-amber-900 text-foreground' },
  { icon: Medal, label: '4th Place', amount: '£30',  tone: 'from-muted to-muted-foreground/50 text-foreground' },
  { icon: Goal,  label: 'Goal of the Tournament', amount: '£100', tone: 'from-primary via-primary/80 to-primary-glow text-primary-foreground' },
];

export default function SweepstakePage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [taken, setTaken] = useState<number | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    if (meta.full_name || meta.name) setName(meta.full_name || meta.name || '');
  }, [user]);

  useEffect(() => {
    // Approximate counter via head request; ignore errors silently.
    (async () => {
      try {
        const { count } = await supabase
          .from('sweepstake_signups')
          .select('id', { count: 'exact', head: true })
          .eq('tournament', 'wc2026');
        if (typeof count === 'number') setTaken(count);
      } catch { /* ignore */ }
    })();
  }, [done]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ display_name: name, email });
    if (!parsed.success) {
      toast({ title: 'Check your details', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('sweepstake_signups').insert({
      display_name: parsed.data.display_name,
      email: parsed.data.email.toLowerCase(),
      user_id: user?.id ?? null,
      tournament: 'wc2026',
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '23505') {
        toast({ title: "You're already on the list ✅", description: "We'll email you the moment ticket sales open." });
        setDone(true);
        return;
      }
      toast({ title: 'Something went wrong', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: "You're in! 🎉", description: "We'll email you tomorrow when tickets go live." });
    setDone(true);
  }

  const spotsLeft = taken == null ? null : Math.max(0, TOTAL_SPOTS - taken);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16 flex-1">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/15 to-navy-dark p-6 md:p-10 shadow-xl shadow-gold/10">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_15%,hsl(var(--gold)/0.25),transparent_55%),radial-gradient(circle_at_85%_85%,hsl(var(--primary)/0.3),transparent_55%)]" />
          <div className="relative max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
              <Sparkles className="h-3.5 w-3.5" /> World Cup 2026 Sweepstake
            </span>
            <h1 className="text-3xl md:text-5xl font-black leading-tight">
              €10 a team. <span className="text-gold">48 spots.</span> One Gaffer-sized prize pot.
            </h1>
            <p className="text-base md:text-lg text-foreground/85">
              Sign up and we'll randomly draw you one of the 48 nations playing the 2026 World Cup.
              If your country goes deep, the pot comes home with you. Sign up today —
              <span className="font-semibold text-foreground"> ticket sales open tomorrow</span>.
            </p>
            {spotsLeft != null && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-3 py-1.5 text-sm">
                <Ticket className="h-4 w-4 text-gold" />
                <span className="font-semibold text-foreground">{spotsLeft}</span>
                <span className="text-muted-foreground">of {TOTAL_SPOTS} spots remaining on the interest list</span>
              </div>
            )}
          </div>
        </div>

        {/* Prizes */}
        <section className="mt-10">
          <h2 className="text-xl md:text-2xl font-black mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" /> Prize Pot
          </h2>
          <div className="grid gap-3 md:grid-cols-5 sm:grid-cols-2">
            {prizes.map(p => (
              <Card key={p.label} className="overflow-hidden border-border/50">
                <div className={`bg-gradient-to-br ${p.tone} p-4 flex flex-col items-center text-center`}>
                  <p.icon className="h-6 w-6 mb-1.5" />
                  <div className="text-2xl font-black tabular-nums">{p.amount}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{p.label}</div>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Top four are decided by tournament finish. Goal of the Tournament is judged by The Gaffer (with a public shortlist) — keeps every group game interesting.
          </p>
        </section>

        {/* How it works + Signup */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/85">
              <Step n={1} title="Reserve your spot today (free)">
                Add your name to the interest list. We'll email you the second ticket sales open.
              </Step>
              <Step n={2} title="Pay €10 per team tomorrow">
                Cards open at 09:00. First 48 paid entries get a nation. One person can buy multiple teams.
              </Step>
              <Step n={3} title="Random draw, live">
                When all 48 are sold, every nation is drawn at random and pinned to your name on the public league table.
              </Step>
              <Step n={4} title="Cheer your country home">
                Live standings update as the tournament progresses. Winners paid within 48 hours of the final whistle.
              </Step>
            </CardContent>
          </Card>

          <Card className="border-gold/40 bg-gradient-to-br from-card to-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5 text-gold" /> Reserve my spot
              </CardTitle>
            </CardHeader>
            <CardContent>
              {done ? (
                <div className="rounded-xl border border-success/40 bg-success/10 p-5 text-center space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <p className="font-bold text-foreground">You're on the list.</p>
                  <p className="text-sm text-muted-foreground">
                    We'll email you the moment ticket sales open tomorrow. Tell a mate — the more in the pot, the bigger the night.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Murphy" maxLength={60} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" maxLength={255} required />
                  </div>
                  <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? 'Reserving…' : 'Reserve my spot — free'}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    No payment now. We'll only email you about the sweepstake.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold text-xs font-black">{n}</div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
