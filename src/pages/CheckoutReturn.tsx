import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-4 rounded-xl border bg-card p-8">
        {!ready ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Activating your membership…</h1>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-bold">Welcome to the Inner Circle ⚽</h1>
            <p className="text-muted-foreground text-sm">
              Your picks, ACCAs and Telegram alerts are unlocked. Get ready for the Gaffer's daily drop at 09:30.
            </p>
            {sessionId && <p className="text-[10px] text-muted-foreground/60 break-all">Ref: {sessionId}</p>}
            <Button asChild className="w-full"><Link to="/">Take me to today's picks</Link></Button>
          </>
        )}
      </div>
    </div>
  );
}
