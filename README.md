# The Footy Oracle ⚽

A football membership club, fronted by **The Gaffer**. Currently transitioning from
an AI betting-tips site into the **Footy Oracle Club** (Fantasy League, daily Gaffer
articles, awards, community) ahead of the new season.

## Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind + shadcn/ui, React Query, React Router
- **Backend:** Supabase (Postgres + Edge Functions), Row Level Security
- **Auth:** Supabase Auth
- **Payments:** Stripe (subscriptions)
- **AI:** LLM content generation via the configured AI gateway
- **Hosting:** Vercel

## Local development

```bash
npm install
cp .env.example .env   # fill in real values (never commit .env)
npm run dev
```

## Environment variables

All secrets live in `.env` locally (gitignored) and in the **Vercel dashboard** for
production. See `.env.example` for the required keys. **Never commit real keys.**

## Project layout

```
src/
  components/        UI + feature sections
  pages/             routed pages
  hooks/             data hooks (React Query)
  integrations/      Supabase client + types
  lib/               utilities
supabase/
  functions/         edge functions
  migrations/        SQL migrations
docs/                design specs (Memory Engine, Member Identity, …)
```

## Status

Active rebuild in progress — see the design specs under `docs/`. The legacy
betting-prediction, form-table and World Cup features are being retired/rebuilt as the
product pivots to the Club.
