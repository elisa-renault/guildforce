-- Compatibility shim for materialization functions that still call the retired
-- assignment seeding RPC. Roster member assignments were retired in
-- 20260621210000; this function intentionally does not recreate them.

CREATE OR REPLACE FUNCTION public.seed_roster_assignments_from_first_approved_wish(
  p_roster_id UUID,
  p_season_id UUID
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT 0::INTEGER;
$$;
