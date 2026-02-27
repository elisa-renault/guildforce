-- Backfill legacy roster selections:
-- mark members as selected when they are confirmed in the guild and already
-- have at least one approved wish validated by a GM or wish manager.
-- This only inserts missing rows or upgrades undecided rows, and preserves any
-- explicit bench / not_selected / selected decisions already present.

WITH eligible_members AS (
  SELECT DISTINCT
    r.id AS roster_id,
    cw.user_id
  FROM public.class_wishes cw
  INNER JOIN public.rosters r
    ON r.id = cw.roster_id
  INNER JOIN public.guild_members gm
    ON gm.guild_id = r.guild_id
   AND gm.user_id = cw.user_id
  WHERE cw.user_id IS NOT NULL
    AND cw.validation_status = 'approved'
    AND cw.validated_by IS NOT NULL
    AND gm.status = 'confirmed'
),
insert_missing AS (
  INSERT INTO public.roster_member_selection (
    roster_id,
    user_id,
    selection_status
  )
  SELECT
    em.roster_id,
    em.user_id,
    'selected'::public.roster_selection_status
  FROM eligible_members em
  LEFT JOIN public.roster_member_selection rms
    ON rms.roster_id = em.roster_id
   AND rms.user_id = em.user_id
  WHERE rms.id IS NULL
  ON CONFLICT (roster_id, user_id) DO NOTHING
  RETURNING id
)
UPDATE public.roster_member_selection rms
SET selection_status = 'selected'
FROM eligible_members em
WHERE rms.roster_id = em.roster_id
  AND rms.user_id = em.user_id
  AND rms.selection_status = 'undecided';
