## MVP Fantasy League — Scoping (FPL API)

A lean, plug-in fantasy league built on top of the free public Fantasy Premier League API. Uses the scaffolding already in the project (`/fantasy-league` route, `FantasyLeagueBanner`, `sweepstake_signups` table, `src/types/footy.ts` fantasy contracts).

---

### What users get (v1)

1. **Sign up / join league** — email + team name, one league to start ("Footy Oracle Fantasy").
2. **Pick a 15-player squad** — 2 GK / 5 DEF / 5 MID / 3 FWD, £100m budget, max 3 per club (mirrors FPL constraints).
3. **Set starting XI + captain / vice** each gameweek before the deadline.
4. **Auto-scoring** — points calculated from real FPL live data after each gameweek.
5. **Live league table** — rank, gameweek points, total points, movement arrows.
6. **Player picker screen** — search / filter by position, club, price, form.

Chips (wildcard, triple captain, bench boost) and transfers are **out of scope for v1** — added in v2 to keep the first ship small.

---

### Screens

```text
/fantasy-league
 ├── Landing (existing banner) → "Join League" CTA
 ├── /fantasy-league/join          → team name + confirm
 ├── /fantasy-league/squad         → pick 15, budget bar, formation preview
 ├── /fantasy-league/pitch         → starting XI, captain armband, bench
 ├── /fantasy-league/league        → standings table, gameweek switcher
 └── /fantasy-league/player/:id    → stats, upcoming fixtures, form
```

---

### Data & scoring

- **Source:** FPL public API (`bootstrap-static/`, `fixtures/`, `event/{gw}/live/`, `element-summary/{id}/`). No API key required.
- **Sync cadence:** hourly during gameweeks, daily otherwise. Runs from the existing daily-orchestrator.
- **Scoring:** mirror official FPL rules in v1 (goals, assists, clean sheets, cards, bonus). Custom Footy Oracle scoring can layer on later.
- **Deadline:** locked to FPL's official gameweek deadline.

---

### Backend (technical section)

Tables:
- `fantasy_players` — synced from FPL bootstrap (id, name, club, position, price, form, total_points)
- `fantasy_fixtures` — gameweek fixtures + difficulty
- `fantasy_teams` — one row per user (team_name, user_id, total_points)
- `fantasy_squads` — 15 player_ids per user per gameweek, captain, vice, XI vs bench
- `fantasy_gameweek_scores` — computed points per user per gameweek

Edge functions:
- `fpl-sync` — pulls bootstrap + fixtures, upserts players
- `fpl-score-gameweek` — after each GW, pulls `event/{gw}/live/`, computes each user's points
- `fpl-league-standings` — aggregates totals for the league table

All tables get RLS: users read their own squad + the public league table; only service role writes scores.

---

### Build order (rough)

1. Tables + FPL sync function (data foundation)
2. Squad picker UI (biggest UX piece)
3. Starting XI + captain screen
4. Scoring job + standings table
5. Player detail modal

Roughly a 3–4 milestone build. Nothing here needs a paid API key.

---

### Open questions before build

- **Scope of league:** just Premier League (FPL native), or do you want to fake a multi-league feel with just one competition to start?
- **Custom scoring or mirror FPL?** Mirroring is faster and users already understand it.
- **Prizes / entry fee?** Free-to-play, or paid pot tied into the existing Stripe setup?
- **Season timing:** start fresh next gameweek, or mid-season join allowed?

Answer those and I'll refine before touching code.
