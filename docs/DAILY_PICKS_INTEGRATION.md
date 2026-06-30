# Daily Picks Integration Contract

Status: live-wired homepage section for Claude / Lovable / Supabase.

Frontend component:

```txt
src/components/homepage/GafferPicksBox.tsx
```

Homepage anchor:

```txt
#daily-picks
```

Runtime markers for builders:

```tsx
data-endpoint="gaffer_picks"
data-lovable-hook="homepage_daily_picks_showcase"
```

---

## Data source

The homepage Daily Picks section reads from the Supabase table:

```txt
gaffer_picks
```

Current frontend query:

```ts
supabase
  .from('gaffer_picks')
  .select('id, pick_date, title, status, stake, bet_type, combined_odds, potential_returns, reasoning, gaffer_intro, updated_at, created_at, legs')
  .in('status', ['published', 'live', 'active'])
  .order('pick_date', { ascending: false })
  .limit(1)
  .maybeSingle()
```

The UI falls back to the form-table engine if no published live pick exists, so the homepage does not break while the data feed is being connected.

---

## `gaffer_picks` row shape

Recommended table columns:

```ts
type GafferPickRow = {
  id: string
  pick_date: string              // YYYY-MM-DD
  title?: string                 // e.g. "Saturday Gaffer Double"
  status: 'draft' | 'published' | 'live' | 'active' | 'expired'
  stake?: number                 // default 10
  bet_type?: 'single' | 'double' | 'treble'
  combined_odds?: number
  potential_returns?: number
  gaffer_intro?: string          // short Gaffer intro line for the card
  reasoning?: string             // fallback intro / longer explanation
  updated_at?: string
  created_at?: string
  legs: DailyPickLeg[]
}
```

---

## Daily pick leg shape

Each leg in `legs` should contain as many of these fields as possible:

```ts
type DailyPickLeg = {
  fixtureId?: string
  fixture_id?: string
  fixture?: string               // fallback: "Arsenal v Tottenham"
  match?: string
  game?: string

  home_team?: string
  away_team?: string
  homeTeam?: string
  awayTeam?: string

  home_logo?: string | null      // team badge URL
  away_logo?: string | null
  homeLogo?: string | null
  awayLogo?: string | null

  league?: string
  region?: string
  kickoff_time?: string          // ISO date-time preferred
  time?: string                  // fallback HH:mm

  market?: string                // Goals / Corners / BTTS / Cards etc.
  bet_type?: string
  selection?: string             // e.g. "BTTS – Yes"
  label?: string

  odds?: number | string         // decimal odds
  price?: number | string        // accepted alias
  confidence?: number            // 0-100 or 0-1 accepted
  probability?: number           // accepted alias
  formProb?: number              // accepted alias
  edge?: number

  gaffer_line?: string           // preferred Gaffer voice line
  reason?: string
  short_reason?: string
  status?: string
}
```

---

## Example payload

```json
{
  "id": "pick_2026_08_16",
  "pick_date": "2026-08-16",
  "title": "The Gaffer's Saturday Double",
  "status": "published",
  "stake": 10,
  "bet_type": "double",
  "combined_odds": 3.44,
  "potential_returns": 34.4,
  "gaffer_intro": "Two selections. No circus. Just value with its boots on.",
  "legs": [
    {
      "fixture_id": "ars-tot-2026-08-16",
      "home_team": "Arsenal",
      "away_team": "Tottenham",
      "home_logo": "/badges/arsenal.png",
      "away_logo": "/badges/tottenham.png",
      "league": "Premier League",
      "region": "England",
      "kickoff_time": "2026-08-16T15:00:00Z",
      "market": "BTTS",
      "selection": "BTTS – Yes",
      "odds": 1.72,
      "confidence": 74,
      "edge": 9,
      "gaffer_line": "Both back lines have got more holes than my old training bib. BTTS is the play."
    },
    {
      "fixture_id": "lee-eve-2026-08-16",
      "home_team": "Leeds",
      "away_team": "Everton",
      "home_logo": "/badges/leeds.png",
      "away_logo": "/badges/everton.png",
      "league": "Premier League",
      "region": "England",
      "kickoff_time": "2026-08-16T17:30:00Z",
      "market": "Corners",
      "selection": "Over 9.5 Corners",
      "odds": 2.0,
      "confidence": 69,
      "edge": 8,
      "gaffer_line": "Two wide teams, full-backs flying, and enough corners to redecorate the clubhouse."
    }
  ]
}
```

---

## Builder notes for Claude and Lovable

1. Do not hard-code daily picks into the component.
2. Update the `gaffer_picks` row daily, or wire an admin/CMS screen to insert the row.
3. Team logos are optional; `TeamAvatar` gracefully falls back to initials.
4. Keep `gaffer_line` short and punchy. One sentence is enough.
5. Publish only one current pick row with `status` set to `published`, `live`, or `active`.
6. Draft rows should use `status = draft` and will not appear on the homepage.
