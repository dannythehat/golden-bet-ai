# Hand-off → Lovable: lighting up the Gaffer's live picks

The Gaffer's backend is built and scheduled. The homepage `GafferPicksBox`
already reads the right contract — **you don't need to change the component.**
Two things must happen in the Supabase project for the live board to fill:

## 1) Set the secrets (Supabase → Project → Functions → Secrets)

| Secret | Value | Used by |
|---|---|---|
| `FOOTYSTATS_KEY` | the FootyStats API key | ingest-form-stats, gaffer-daily-pick, settle-gaffer-picks |
| `FOOTYSTATS_SEASON_IDS` | `16696:Iceland Urvalsdeild,16558:Norway Eliteserien,16576:Sweden Allsvenskan` | which leagues to ingest (id:name, comma-separated) |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are already present for edge functions.
Add UK/Euro season ids to `FOOTYSTATS_SEASON_IDS` as those leagues come back in.

## 2) Deploy + let the cron run

Deploy these functions (already in the repo): `ingest-form-stats`,
`gaffer-daily-pick`, `settle-gaffer-picks`, and the updated `daily-orchestrator`.
The orchestrator (driven by the existing per-minute pg_cron) now runs:

- **02:00 UTC (03:00 London/BST)** → `ingest-form-stats` (form → `form_tables`)
- **02:20 UTC** → `gaffer-daily-pick` (value engine + voice → `gaffer_picks`)
- **evenings** → `settle-gaffer-picks` (results → `status`, `profit_loss`)

To test immediately, invoke `ingest-form-stats` then `gaffer-daily-pick` by hand.

## The contract you read (already matches)

`gaffer_picks` (public-read) — newest actionable row is `status in ('published','live','active')`:

```
{ id, pick_date, title, status, stake, bet_type, combined_odds,
  potential_returns, reasoning, gaffer_intro,            // hero copy
  legs: [ {
    fixtureId, home_team, away_team, home_logo, away_logo,
    league, region, kickoff_time, market, selection,
    odds, formProb, edge,
    gaffer_line          // ← the Gaffer's real voice for this leg
  } ] }
```

- Settled picks flip to `won`/`lost` (with `profit_loss`) and drop off the live
  board automatically — use those rows for the **P&L** section.
- `form_tables` (public-read) powers the form tables: `{ league_id, league_name,
  team_id, team, window_size, stats:{ overPct, avgGoals, avgCorners, avgCards } }`.

## Notes

- No `get-*` read endpoints needed — both tables are public-read; the frontend
  reads them directly (as `GafferPicksBox` already does).
- The site already falls back to the local form-table engine when no live row
  exists, so nothing breaks before the first cron run.
- The voice lives in **two** synced copies: `src/data/gaffer/*` (frontend) and
  `supabase/functions/_shared/gaffer*` (edge). Edit both if you grow the banks.
