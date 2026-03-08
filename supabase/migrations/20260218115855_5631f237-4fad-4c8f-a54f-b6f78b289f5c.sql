
-- ══════════════════════════════════════════════════════════════════════════════
-- Step 3: Referee Dimension Table + Normalized Key Column
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Create dim_referee
-- referee_key = lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
CREATE TABLE IF NOT EXISTS public.dim_referee (
  referee_key          TEXT PRIMARY KEY,     -- canonical normalized key (no fuzzy, just whitespace-norm)
  referee_name_raw     TEXT NOT NULL,        -- original string as returned by API-Football
  matches_count        INTEGER NOT NULL DEFAULT 0,
  cards_per_match      NUMERIC(5,2),         -- NULL until Step 3B computes from real data
  fouls_per_match      NUMERIC(5,2),
  pens_per_match       NUMERIC(5,2),
  -- Collision auditing — never manual, just automatic flagging
  collision_suspected  BOOLEAN NOT NULL DEFAULT false,
  collision_reason     TEXT,
  last_updated         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: service role writes, anyone can read (needed for inference)
ALTER TABLE public.dim_referee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dim_referee_public_read"
  ON public.dim_referee FOR SELECT USING (true);

CREATE POLICY "dim_referee_service_write"
  ON public.dim_referee FOR ALL
  USING (true) WITH CHECK (true);

-- Index for quick lookup during join
CREATE INDEX IF NOT EXISTS idx_dim_referee_matches_count
  ON public.dim_referee (matches_count DESC);

CREATE INDEX IF NOT EXISTS idx_dim_referee_collision
  ON public.dim_referee (collision_suspected)
  WHERE collision_suspected = true;

-- 2. Add referee_key to ml_training_data_v2 (normalized FK-style, nullable = always left join)
ALTER TABLE public.ml_training_data_v2
  ADD COLUMN IF NOT EXISTS referee_key TEXT;

CREATE INDEX IF NOT EXISTS idx_ml_v2_referee_key
  ON public.ml_training_data_v2 (referee_key)
  WHERE referee_key IS NOT NULL;

-- 3. Add referee_key to ml_training_data (v1) for completeness
ALTER TABLE public.ml_training_data
  ADD COLUMN IF NOT EXISTS referee_key TEXT;

CREATE INDEX IF NOT EXISTS idx_ml_v1_referee_key
  ON public.ml_training_data (referee_key)
  WHERE referee_key IS NOT NULL;
