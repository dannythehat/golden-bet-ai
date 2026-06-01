-- Fix: LIKE '__%' was matching everything (underscore is wildcard).
-- Use explicit sentinel exclusion instead.

CREATE OR REPLACE FUNCTION public.refresh_v2_referee_features()
RETURNS TABLE(rows_updated bigint, referees_covered bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows bigint;
  v_refs bigint;
BEGIN
  WITH ref_stats AS (
    SELECT
      referee_key,
      AVG(total_cards)::numeric(6,3)                                   AS avg_cards,
      AVG(CASE WHEN total_cards > 3.5 THEN 1 ELSE 0 END)::numeric(6,4) AS over35_rate
    FROM ml_training_data_v2
    WHERE referee_key IS NOT NULL
      AND referee_key NOT IN ('__ingest_state__', '__no_ref__')
      AND total_cards IS NOT NULL
    GROUP BY referee_key
    HAVING COUNT(*) >= 5
  ),
  upd AS (
    UPDATE ml_training_data_v2 v
    SET
      ref_avg_cards_last50         = rs.avg_cards,
      ref_over35_cards_rate_last50 = rs.over35_rate
    FROM ref_stats rs
    WHERE v.referee_key = rs.referee_key
      AND (
        v.ref_avg_cards_last50         IS DISTINCT FROM rs.avg_cards
        OR v.ref_over35_cards_rate_last50 IS DISTINCT FROM rs.over35_rate
      )
    RETURNING v.id, rs.referee_key
  )
  SELECT COUNT(*), COUNT(DISTINCT referee_key) INTO v_rows, v_refs FROM upd;

  RETURN QUERY SELECT v_rows, v_refs;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_v2_referee_features() TO service_role;

-- Run the (now corrected) backfill immediately
SELECT * FROM public.refresh_v2_referee_features();