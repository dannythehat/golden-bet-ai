// ============================================================================
// Footy Oracle — fantasy squad store (shared)
// User squads live in OUR database (FPL is read-only), stored as the full
// FantasyTeam contract in a `fantasy_teams` table:
//
//   create table fantasy_teams (
//     id text primary key,            -- team id
//     member_id text,
//     league_id text,
//     data jsonb not null,            -- the FantasyTeam payload
//     updated_at timestamptz default now()
//   );
//
// Helpers return null when the store is unavailable (table not yet created by
// Lovable), so mutation functions can fail cleanly with STORE_UNAVAILABLE.
// ============================================================================
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { FantasyTeam } from "../../../src/types/footy.ts";

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function loadTeam(sb: SupabaseClient, teamId: string): Promise<FantasyTeam | null> {
  try {
    const { data, error } = await sb.from("fantasy_teams").select("data").eq("id", teamId).maybeSingle();
    if (error || !data) return null;
    return (data as { data: FantasyTeam }).data;
  } catch {
    return null;
  }
}

/** Persist the team (best-effort). Returns true on success. */
export async function saveTeam(sb: SupabaseClient, team: FantasyTeam): Promise<boolean> {
  try {
    const { error } = await sb.from("fantasy_teams").upsert({
      id: team.id, member_id: team.member_id, league_id: team.league_id, data: team, updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
