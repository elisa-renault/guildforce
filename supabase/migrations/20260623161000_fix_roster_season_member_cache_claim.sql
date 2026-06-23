-- When an external roster-cache member becomes linked to a Guildforce user,
-- materialization may insert/update a linked season-member row with the same
-- roster_cache_id that was previously held by the external row. Merge that
-- stale external row before the partial unique index can reject the write.

CREATE OR REPLACE FUNCTION public.merge_roster_season_member_cache_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_stale_external_id UUID;
  v_duplicate_user_id UUID;
BEGIN
  IF NEW.user_id IS NULL OR NEW.roster_cache_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT rsm.id
  INTO v_stale_external_id
  FROM public.roster_season_members rsm
  WHERE rsm.roster_id = NEW.roster_id
    AND rsm.season_id = NEW.season_id
    AND rsm.roster_cache_id = NEW.roster_cache_id
    AND rsm.user_id IS NULL
    AND (TG_OP = 'INSERT' OR rsm.id <> NEW.id)
  LIMIT 1;

  IF v_stale_external_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT rsm.id
  INTO v_duplicate_user_id
  FROM public.roster_season_members rsm
  WHERE rsm.roster_id = NEW.roster_id
    AND rsm.season_id = NEW.season_id
    AND rsm.user_id = NEW.user_id
    AND rsm.id <> v_stale_external_id
    AND (TG_OP = 'INSERT' OR rsm.id <> NEW.id)
  LIMIT 1;

  IF TG_OP = 'INSERT' AND v_duplicate_user_id IS NULL THEN
    UPDATE public.roster_season_members rsm
    SET user_id = NEW.user_id,
        display_name_snapshot = NEW.display_name_snapshot,
        character_name_snapshot = NEW.character_name_snapshot,
        realm_snapshot = NEW.realm_snapshot,
        rank_index_snapshot = NEW.rank_index_snapshot,
        source = NEW.source,
        season_status = CASE
          WHEN rsm.season_status IN ('selected', 'bench', 'departed', 'removed', 'declined')
            THEN rsm.season_status
          ELSE NEW.season_status
        END,
        updated_at = now()
    WHERE rsm.id = v_stale_external_id;

    RETURN NULL;
  END IF;

  DELETE FROM public.roster_season_members
  WHERE id = v_stale_external_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_merge_roster_season_member_cache_claim
  ON public.roster_season_members;

CREATE TRIGGER trigger_merge_roster_season_member_cache_claim
BEFORE INSERT OR UPDATE OF user_id, roster_cache_id
ON public.roster_season_members
FOR EACH ROW
EXECUTE FUNCTION public.merge_roster_season_member_cache_claim();
