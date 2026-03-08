# API-Football Integration

This document explains the API-Football integration for live form tables.

## Overview

The Live Form Tables section fetches real-time football statistics from API-Football and displays them in an organized, filterable format.

## Architecture

### 1. **Service Layer** (`src/services/footballApi.ts`)
- Handles all API requests to API-Football
- Base URL: `https://v3.football.api-sports.io`
- Functions:
  - `getLeagues()` - Fetch all available leagues
  - `getTeamsByLeague()` - Get teams in a specific league
  - `getTeamStatistics()` - Get detailed team statistics
  - `getTeamFixtures()` - Get team fixtures
  - `getFixtureStatistics()` - Get fixture-level stats (corners, cards, etc.)

### 2. **Data Transformation** (`src/lib/apiTransformers.ts`)
- Converts API-Football data to our application format
- Functions:
  - `transformToGoalFormStats()` - Calculate goal over/under percentages
  - `transformToCornerStats()` - Calculate corner statistics
  - `transformToCardStats()` - Calculate card statistics
  - `transformToBTTSStats()` - Calculate Both Teams To Score stats
  - `getRegionFromCountry()` - Map countries to regions

### 3. **React Query Hooks** (`src/hooks/useFootballApi.ts`)
- Manages data fetching, caching, and state
- Hooks:
  - `useLeagues()` - Fetch leagues (cached for 24 hours)
  - `useGoalFormStats()` - Fetch goal statistics (cached for 30 minutes)
  - `useCornerStats()` - Fetch corner statistics (cached for 30 minutes)
  - `useCardStats()` - Fetch card statistics (cached for 30 minutes)
  - `useBTTSStats()` - Fetch BTTS statistics (cached for 30 minutes)

### 4. **UI Component** (`src/components/sections/LiveFormTablesSection.tsx`)
- User interface for viewing live statistics
- Features:
  - League selector (grouped by country)
  - Region filter (UK, European, Asia, Americas)
  - Overs/Unders toggle
  - Four market tabs: Goals, Corners, Cards, BTTS
  - Loading states
  - Error handling
  - Click to add teams to watchlist

## Environment Variables

Add your API-Football key to `.env`:

```env
VITE_API_FOOTBALL_KEY=your_api_key_here
```

## Data Flow

1. User selects a league from dropdown
2. React Query hooks fetch data from API-Football
3. Data is transformed to match our application types
4. Results are cached for performance
5. UI displays formatted statistics with color-coded percentages

## Statistics Calculated

### Goals
- Over/Under 0.5, 1.5, 2.5, 3.5 goals
- Based on total goals in each match

### Corners
- Over/Under 7.5, 8.5, 9.5, 10.5 corners
- Average corners per match
- Extracted from fixture statistics

### Cards
- Over/Under 2.5, 3.5, 4.5, 5.5 cards
- Average cards per match
- Combines yellow and red cards

### BTTS (Both Teams To Score)
- BTTS Yes/No percentages
- Average goals scored
- Average goals conceded

## Color Coding

Percentages are color-coded for quick analysis:
- **Green** (≥75%): Very high probability
- **Gold** (≥60%): High probability
- **Orange** (≥45%): Medium probability
- **Red** (<45%): Low probability

## Performance Optimization

- **Caching**: React Query caches results to minimize API calls
- **Stale Time**: 
  - Leagues: 24 hours (rarely change)
  - Statistics: 30 minutes (updated regularly)
- **Parallel Fetching**: Multiple team stats fetched concurrently
- **Limit**: Top 20 teams per league to manage API quota

## API Limits

API-Football free tier has request limits. The implementation:
- Caches aggressively to reduce calls
- Limits to 20 teams per league
- Only fetches when league is selected
- Reuses cached data when possible

## Future Enhancements

Potential improvements:
- Add more leagues/competitions
- Historical data comparison
- Team-specific deep dive
- Export statistics to CSV
- Custom date range filtering
- Head-to-head comparisons
