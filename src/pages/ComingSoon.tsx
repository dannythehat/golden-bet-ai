import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  eyebrow?: string;
  description?: string;
}

export default function ComingSoon({ title, eyebrow, description }: ComingSoonProps) {
  const location = useLocation();
  const derived = title ?? location.pathname.replace(/^\//, "").replace(/-/g, " ") || "New section";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-navy-dark via-primary/15 to-navy-dark p-8 md:p-16 text-center shadow-xl shadow-gold/10">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_50%_0%,hsl(var(--gold)/0.25),transparent_60%)]" />
          <div className="relative max-w-2xl mx-auto space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-gold">
              <Sparkles className="h-3.5 w-3.5" /> {eyebrow ?? "Coming Soon"}
            </span>
            <h1 className="text-3xl md:text-5xl font-black capitalize text-foreground">
              {derived}
            </h1>
            <p className="text-base md:text-lg text-foreground/80">
              {description ?? "This section of The Footy Oracle is being rebuilt from scratch. Check back shortly — it's going to be worth the wait."}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
