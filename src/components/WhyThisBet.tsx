import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import theGafferImage from "@/assets/the-gaffer.webp";
import { cn } from "@/lib/utils";

interface Props {
  fixtureId?: string | number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  odds: number;
  mlConfidence?: number;
  valueEdge?: number;
  gafferReasoning?: string | null;
  className?: string;
}

export function WhyThisBet(props: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const { toast } = useToast();

  const handleClick = async () => {
    setOpen(true);
    if (explanation) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("why-this-bet", {
        body: {
          fixtureId: props.fixtureId,
          homeTeam: props.homeTeam,
          awayTeam: props.awayTeam,
          league: props.league,
          market: props.market,
          odds: props.odds,
          mlConfidence: props.mlConfidence,
          valueEdge: props.valueEdge,
          gafferReasoning: props.gafferReasoning,
        },
      });
      if (error) throw error;
      setExplanation(data?.explanation || "The Gaffer's lost his voice. Try again.");
    } catch (e: any) {
      toast({ title: "Couldn't reach The Gaffer", description: e?.message || "Try again shortly.", variant: "destructive" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={cn("w-full gap-2 border-[hsl(var(--neon-yellow)/.5)] bg-[hsl(var(--neon-yellow)/.08)] text-[hsl(var(--neon-yellow))] hover:bg-[hsl(var(--neon-yellow)/.15)]", props.className)}
      >
        <Sparkles className="w-4 h-4" />
        Why this bet?
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={theGafferImage} alt="The Gaffer" className="w-8 h-8 rounded-full object-cover border border-[hsl(var(--neon-yellow)/.6)]" />
              The Gaffer's Verdict
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            {props.homeTeam} vs {props.awayTeam} — <span className="text-foreground font-semibold">{props.market} @ {props.odds}</span>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-yellow)/.15)] to-[hsl(var(--neon-yellow)/.05)] border border-[hsl(var(--neon-yellow)/.4)] min-h-[120px]">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> The Gaffer's having a think...
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{explanation}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
