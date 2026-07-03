// ============================================================================
// Footy Oracle — fantasy squad validation engine (shared)
// Enforces the LOCKED rules: £100m, 15 players (2 GK / 5 DEF / 5 MID / 3 FWD),
// max 3 per club, a legal starting XI, a 4-man bench (1 GK + 3), and a valid
// captain/vice. Returns FantasyValidationResult + typed error codes used by the
// mutation functions. Pure — no I/O.
// ============================================================================
import type { FantasyPlayer, FantasyPosition, FantasyValidationResult } from "../../../src/types/footy.ts";

export const RULES = {
  budget: 100,
  squadSize: 15,
  starters: 11,
  bench: 4,
  squad: { GK: 2, DEF: 5, MID: 5, FWD: 3 } as Record<FantasyPosition, number>,
  // starting XI bounds (GK is always 1)
  xi: { DEF: [3, 5], MID: [2, 5], FWD: [1, 3] } as Record<string, [number, number]>,
  maxPerClub: 3,
} as const;

export type ValidationCode =
  | "INVALID_SQUAD_SIZE" | "INVALID_POSITION_BALANCE" | "BUDGET_EXCEEDED"
  | "MAX_CLUB_PLAYERS_EXCEEDED" | "INVALID_FORMATION" | "INVALID_BENCH" | "INVALID_CAPTAIN";

const countByPos = (ps: FantasyPlayer[]) => ps.reduce((m, p) => { m[p.position] = (m[p.position] ?? 0) + 1; return m; }, {} as Record<FantasyPosition, number>);

/** Validate the full 15-man squad (size, position quota, budget, club cap). */
export function validateSquad(players: FantasyPlayer[]): FantasyValidationResult & { code?: ValidationCode } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let code: ValidationCode | undefined;

  const ids = new Set(players.map((p) => p.id));
  if (players.length !== RULES.squadSize || ids.size !== RULES.squadSize) {
    errors.push(`Your squad must contain exactly ${RULES.squadSize} unique players.`); code ??= "INVALID_SQUAD_SIZE";
  }
  const pos = countByPos(players);
  (Object.keys(RULES.squad) as FantasyPosition[]).forEach((k) => {
    if ((pos[k] ?? 0) !== RULES.squad[k]) { errors.push(`You need exactly ${RULES.squad[k]} ${k}.`); code ??= "INVALID_POSITION_BALANCE"; }
  });
  const spend = players.reduce((s, p) => s + p.price, 0);
  if (spend > RULES.budget + 1e-9) { errors.push(`You're £${(spend - RULES.budget).toFixed(1)}m over the £${RULES.budget}m budget.`); code ??= "BUDGET_EXCEEDED"; }

  const perClub = players.reduce((m, p) => { m[p.club.id] = (m[p.club.id] ?? 0) + 1; return m; }, {} as Record<string, number>);
  const overClub = Object.entries(perClub).find(([, n]) => n > RULES.maxPerClub);
  if (overClub) { errors.push(`Max ${RULES.maxPerClub} players from one club — you have ${overClub[1]}.`); code ??= "MAX_CLUB_PLAYERS_EXCEEDED"; }

  players.filter((p) => p.status !== "available").forEach((p) => warnings.push(`${p.name} is ${p.status}.`));

  return { valid: errors.length === 0, errors, warnings, code };
}

/** Validate the starting XI + bench + captain/vice against the squad. */
export function validateLineup(
  players: FantasyPlayer[], starters: string[], bench: string[], captainId: string, viceId: string,
): FantasyValidationResult & { code?: ValidationCode } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let code: ValidationCode | undefined;
  const byId = new Map(players.map((p) => [p.id, p]));

  if (starters.length !== RULES.starters) { errors.push(`Your starting line-up must be ${RULES.starters} players.`); code ??= "INVALID_FORMATION"; }
  if (bench.length !== RULES.bench) { errors.push(`Your bench must be ${RULES.bench} players.`); code ??= "INVALID_BENCH"; }

  const startPlayers = starters.map((id) => byId.get(id)).filter(Boolean) as FantasyPlayer[];
  const sp = countByPos(startPlayers);
  if ((sp.GK ?? 0) !== 1) { errors.push("Start exactly one goalkeeper."); code ??= "INVALID_FORMATION"; }
  (["DEF", "MID", "FWD"] as const).forEach((k) => {
    const [min, max] = RULES.xi[k];
    if ((sp[k] ?? 0) < min || (sp[k] ?? 0) > max) { errors.push(`Start between ${min} and ${max} ${k}.`); code ??= "INVALID_FORMATION"; }
  });

  const benchPlayers = bench.map((id) => byId.get(id)).filter(Boolean) as FantasyPlayer[];
  if (benchPlayers.filter((p) => p.position === "GK").length !== 1) { errors.push("Your bench must include exactly one goalkeeper."); code ??= "INVALID_BENCH"; }

  if (!starters.includes(captainId)) { errors.push("Your captain must be in the starting XI."); code ??= "INVALID_CAPTAIN"; }
  if (!starters.includes(viceId)) { errors.push("Your vice-captain must be in the starting XI."); code ??= "INVALID_CAPTAIN"; }
  if (captainId && captainId === viceId) { errors.push("Captain and vice-captain must be different players."); code ??= "INVALID_CAPTAIN"; }

  return { valid: errors.length === 0, errors, warnings, code };
}
