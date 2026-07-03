# Footy Oracle Data Contracts

Status: v1 Fantasy slice for Lovable build.

This document is the frontend integration contract. The TypeScript source of truth is:

```ts
src/types/footy.ts
```

Lovable should import shared types from that file only. Do not duplicate payload interfaces locally.

---

## Global invocation style

All frontend calls use Supabase Edge Functions:

```ts
const { data, error } = await supabase.functions.invoke(name, { body })
```

Functions return JSON directly in this envelope:

```ts
type ApiResponse<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } }
```

Frontend should handle both Supabase transport errors and `{ ok: false }` application errors.

---

## Shared types

Import from:

```ts
import type {
  ApiResponse,
  FantasyStandingsResponse,
  FantasyTeam,
  FantasyPlayersResponse,
  FantasyGameweekResponse,
  FantasyPrizesResponse,
  GetFantasyStandingsRequest,
  GetFantasyTeamRequest,
  GetFantasyPlayersRequest,
  GetFantasyGameweekRequest,
  GetFantasyPrizesRequest,
  SaveSquadRequest,
  SaveSquadResponse,
  SubmitTransfersRequest,
  SubmitTransfersResponse,
  SetCaptainRequest,
  SetViceRequest,
  CaptainMutationResponse,
  PlayChipRequest,
  PlayChipResponse,
  FantasyScoreRealtimePayload,
  FantasyStandingsRealtimePayload,
} from '@/types/footy'
```

---

# Fantasy League — Read Endpoints

## 1. `get-fantasy-standings`

Purpose: leaderboard for a league and optional gameweek.

Request:

```json
{
  "leagueId": "main-2025-26",
  "gameweek": 1
}
```

Response type:

```ts
ApiResponse<FantasyStandingsResponse>
```

Sample response:

```json
{
  "ok": true,
  "data": {
    "league_id": "main-2025-26",
    "season": "2025/26",
    "gameweek": 1,
    "status": "open",
    "updated_at": "2025-08-16T18:05:22Z",
    "rows": [
      {
        "rank": 1,
        "previous_rank": 4,
        "movement": 3,
        "team_id": "team_001",
        "team_name": "No Kane No Gain",
        "manager_name": "Dave from Scunthorpe",
        "avatar_url": "/assets/avatars/team-purple.png",
        "gameweek_points": 84,
        "total_points": 84,
        "transfers_made": 0,
        "transfer_hits": 0,
        "awards_count": 1
      },
      {
        "rank": 2,
        "previous_rank": 1,
        "movement": -1,
        "team_id": "team_gaffer",
        "team_name": "The Gaffer's XI",
        "manager_name": "The Gaffer",
        "gameweek_points": 77,
        "total_points": 77,
        "transfers_made": 0,
        "transfer_hits": 0,
        "awards_count": 0
      }
    ]
  }
}
```

---

## 2. `get-fantasy-team`

Purpose: load a member fantasy squad for My Team / Pick Squad / Transfers.

Request:

```json
{
  "teamId": "team_001",
  "gameweek": 1
}
```

Response type:

```ts
ApiResponse<FantasyTeam>
```

Sample response:

```json
{
  "ok": true,
  "data": {
    "id": "team_001",
    "member_id": "member_001",
    "league_id": "main-2025-26",
    "name": "No Kane No Gain",
    "avatar_url": "/assets/avatars/team-purple.png",
    "budget_total": 100,
    "budget_remaining": 1.5,
    "squad_value": 98.5,
    "free_transfers": 1,
    "transfer_hits": 0,
    "updated_at": "2025-08-15T22:10:00Z",
    "slots": [
      {
        "is_starter": true,
        "is_captain": true,
        "is_vice_captain": false,
        "player": {
          "id": "p_haaland",
          "external_id": "api_12345",
          "name": "Erling Haaland",
          "position": "FWD",
          "club": { "id": "man-city", "name": "Manchester City", "short_name": "MCI", "badge_url": "/badges/mci.png" },
          "price": 14,
          "status": "available",
          "selected_by_percent": 62.4,
          "total_points": 0,
          "form": 0,
          "next_fixture": "Wolves (A)"
        }
      }
    ]
  }
}
```

---

## 3. `get-fantasy-players`

Purpose: searchable/filterable player pool.

Request:

```json
{
  "filters": {
    "position": "MID",
    "club": "arsenal",
    "max_price": 10,
    "search": "saka",
    "sort": "total_points",
    "direction": "desc",
    "limit": 25,
    "offset": 0
  }
}
```

Response type:

```ts
ApiResponse<FantasyPlayersResponse>
```

Sample response:

```json
{
  "ok": true,
  "data": {
    "total": 1,
    "updated_at": "2025-08-15T10:00:00Z",
    "filters": { "position": "MID", "club": "arsenal", "search": "saka", "sort": "total_points", "direction": "desc", "limit": 25, "offset": 0 },
    "players": [
      {
        "id": "p_saka",
        "external_id": "api_67890",
        "name": "Bukayo Saka",
        "position": "MID",
        "club": { "id": "arsenal", "name": "Arsenal", "short_name": "ARS", "badge_url": "/badges/ars.png" },
        "price": 10,
        "status": "available",
        "selected_by_percent": 44.2,
        "total_points": 0,
        "form": 0,
        "next_fixture": "Spurs (H)"
      }
    ]
  }
}
```

---

## 4. `get-fantasy-gameweek`

Purpose: current gameweek metadata, fixtures, deadline, bonus rules.

Request:

```json
{
  "gameweek": 1
}
```

Response type:

```ts
ApiResponse<FantasyGameweekResponse>
```

Sample response:

```json
{
  "ok": true,
  "data": {
    "season": "2025/26",
    "gameweek": 1,
    "status": "open",
    "deadline_at": "2025-08-16T10:30:00Z",
    "reveal_at": "2025-08-16T11:00:00Z",
    "updated_at": "2025-08-15T18:00:00Z",
    "bonus_rules": [
      { "key": "manual_bonus", "label": "Gaffer Bonus", "description": "Optional 0-3 bonus points, configurable/admin-calculated later." }
    ],
    "fixtures": [
      {
        "id": "fx_001",
        "kickoff_time": "2025-08-16T11:30:00Z",
        "home_team": { "id": "liverpool", "name": "Liverpool", "short_name": "LIV", "badge_url": "/badges/liv.png" },
        "away_team": { "id": "bournemouth", "name": "Bournemouth", "short_name": "BOU", "badge_url": "/badges/bou.png" },
        "status": "scheduled"
      }
    ]
  }
}
```

---

## 5. `get-fantasy-prizes`

Purpose: fantasy prize page / hub prize tiles.

**Prizes are admin-driven and NON-CASH only.** The UI never hard-codes a reward or a
fixed value — it renders exactly what this endpoint returns. Use the language of
prizes, rewards, vouchers, trips, experiences and specials; never cash, payout,
winnings or money.

Each prize carries an optional `trigger` (how it's won) and `tone`
(`serious` leaderboard reward vs `fun` engagement reward), so the model supports
both serious rewards and funny rewards for managers who aren't doing well:

- `gameweek_top` — highest scorer of the week
- `monthly_top` — monthly winner
- `season_top` — season winner
- `rank_climber` — biggest rank climber
- `best_bench` — best bench points
- `worst_captain` — worst captain pick (fun)
- `wooden_spoon` — Donkey of the Week (fun)
- `themed` — holiday / calendar special
- `manual` — admin-defined, any criteria

`category` (`weekly | monthly | seasonal | themed | random`) groups prizes for
display; `reward_type` (`voucher | trip | experience | merch | special | other`)
is the non-cash reward kind.

Request:

```json
{
  "season": "2025/26"
}
```

Response type:

```ts
ApiResponse<FantasyPrizesResponse>
```

Sample response:

```json
{
  "ok": true,
  "data": {
    "season": "2025/26",
    "updated_at": "2025-08-01T09:00:00Z",
    "prizes": [
      {
        "id": "prize_season_trip",
        "season": "2025/26",
        "title": "Tropical Escape",
        "description": "The season champion's grand reward — a dream footy getaway.",
        "image_url": "/images/fantasy/prizes/prize-tropical.jpg",
        "category": "seasonal",
        "trigger": "season_top",
        "tone": "serious",
        "reward_type": "trip",
        "enabled": true
      },
      {
        "id": "prize_gw_experience",
        "season": "2025/26",
        "title": "Matchday Experience",
        "description": "Highest scorer of the gameweek bags an exclusive day out.",
        "image_url": "/images/fantasy/prizes/prize-experiences.jpg",
        "category": "weekly",
        "trigger": "gameweek_top",
        "tone": "serious",
        "reward_type": "experience",
        "enabled": true
      },
      {
        "id": "prize_donkey",
        "season": "2025/26",
        "title": "Donkey of the Week",
        "description": "Finish bottom and claim the ears — a badge of dishonour and a little something.",
        "image_url": "/images/fantasy/prizes/prize-donkey.jpg",
        "category": "random",
        "trigger": "wooden_spoon",
        "tone": "fun",
        "reward_type": "merch",
        "enabled": true
      }
    ]
  }
}
```

---

# Fantasy League — Mutations

## 1. `save-squad`

Purpose: save draft squad and formation before deadline.

Request:

```json
{
  "teamId": "team_001",
  "playerIds": ["p_gk1", "p_def1", "p_mid1", "p_fwd1"],
  "starters": ["p_gk1", "p_def1", "p_mid1", "p_fwd1"],
  "bench": ["p_gk2", "p_def2"],
  "captainId": "p_fwd1",
  "viceCaptainId": "p_mid1"
}
```

Response:

```ts
ApiResponse<SaveSquadResponse>
```

Error shape example:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_FORMATION",
    "message": "Your starting XI must contain at least 3 defenders, 2 midfielders and 1 forward."
  }
}
```

---

## 2. `submit-transfers`

Request:

```json
{
  "teamId": "team_001",
  "gameweek": 2,
  "outPlayerIds": ["p_mid_old"],
  "inPlayerIds": ["p_mid_new"]
}
```

Response:

```ts
ApiResponse<SubmitTransfersResponse>
```

Common errors:

- `DEADLINE_PASSED`
- `PLAYER_UNAVAILABLE`
- `BUDGET_EXCEEDED`
- `MAX_CLUB_PLAYERS_EXCEEDED`
- `INVALID_POSITION_BALANCE`

---

## 3. `set-captain`

Request:

```json
{
  "teamId": "team_001",
  "playerId": "p_fwd1",
  "gameweek": 1
}
```

Response:

```ts
ApiResponse<CaptainMutationResponse>
```

---

## 4. `set-vice`

Request:

```json
{
  "teamId": "team_001",
  "playerId": "p_mid1",
  "gameweek": 1
}
```

Response:

```ts
ApiResponse<CaptainMutationResponse>
```

---

## 5. `play-chip`

Request:

```json
{
  "teamId": "team_001",
  "chip": "wildcard",
  "gameweek": 4
}
```

Response:

```ts
ApiResponse<PlayChipResponse>
```

Chips reserved in v1 schema:

- `wildcard`
- `bench_boost`
- `triple_captain`
- `free_hit`

Full chip logic may be implemented after the base squad/transfer/scoring loop.

---

# Realtime channels

## Channel: `fantasy-scores`

Payload type:

```ts
FantasyScoreRealtimePayload
```

Sample payload:

```json
{
  "type": "fantasy-score-updated",
  "gameweek": 1,
  "team_id": "team_001",
  "player_id": "p_saka",
  "points_delta": 5,
  "player_gameweek_points": 8,
  "team_gameweek_points": 54,
  "team_total_points": 54,
  "updated_at": "2025-08-16T15:42:10Z"
}
```

Frontend patch key:

- `team_id`
- `player_id`
- `gameweek`

---

## Channel: `standings`

Payload type:

```ts
FantasyStandingsRealtimePayload
```

Sample payload:

```json
{
  "type": "standings-updated",
  "league_id": "main-2025-26",
  "gameweek": 1,
  "team_id": "team_001",
  "rank": 2,
  "previous_rank": 7,
  "total_points": 71,
  "gameweek_points": 71,
  "updated_at": "2025-08-16T17:59:20Z"
}
```

Frontend patch key:

- `league_id`
- `team_id`
- `gameweek`

---

# Endpoint names — Fantasy v1

Read:

- `get-fantasy-standings`
- `get-fantasy-team`
- `get-fantasy-players`
- `get-fantasy-gameweek`
- `get-fantasy-prizes`

Mutations:

- `save-squad`
- `submit-transfers`
- `set-captain`
- `set-vice`
- `play-chip`

Realtime:

- `fantasy-scores`
- `standings`

---

# KEEP vs DEPRECATE — existing functions

Pending full Claude engine audit.

Frontend rule for Lovable:

1. Do not wire new Fantasy UI to old functions.
2. Only use endpoint names listed in this document for Fantasy v1.
3. Treat all undocumented legacy functions as deprecated unless Claude explicitly confirms KEEP in a later `SYSTEM_ARCHITECTURE.md` or `DATA_CONTRACTS.md` update.
4. Homepage CMS/blog/auth/Stripe functions remain untouched unless they are already used by the current live app.

---

# Build guidance for Lovable

You may now build production Fantasy pages against these contracts:

- Fantasy League Hub
- Pick Squad
- My Team
- Transfers
- Standings
- Gameweek Results
- Prizes
- Rules / How To Play

Use sample payloads for skeleton/empty/error states until Claude lands live endpoints.

Do not invent extra fields. If a UI requires a field not present here, request a contract update before using it.
