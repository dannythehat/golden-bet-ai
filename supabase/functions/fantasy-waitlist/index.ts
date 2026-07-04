// ============================================================================
// Footy Oracle — fantasy-waitlist
// Captures a "Notify me" email for the coming-soon Fantasy league.
// POST { email, source? } → ApiResponse<{ subscribed: true }>. Dedupes by email.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { email, source } = await readBody<{ email?: string; source?: string }>(req);
    const clean = (email ?? "").trim().toLowerCase();
    if (!clean || clean.length > 254 || !EMAIL_RE.test(clean)) {
      return fail("INVALID_EMAIL", "Enter a valid email address.", 422);
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await sb
      .from("fantasy_waitlist")
      .upsert({ email: clean, source: source ?? "homepage" }, { onConflict: "email", ignoreDuplicates: true });
    if (error) return fail("WAITLIST_INSERT_FAILED", error.message, 500);

    return ok({ subscribed: true });
  } catch (err) {
    return fail("WAITLIST_ERROR", `Could not join the waitlist: ${(err as Error).message}`, 500);
  }
});
