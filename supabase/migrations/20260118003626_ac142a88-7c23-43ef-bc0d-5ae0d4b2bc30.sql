-- Atomic main-character setter to avoid race conditions with background sync
-- and keep profiles.main_character_name consistent with wow_characters.is_main

CREATE OR REPLACE FUNCTION public.set_main_character(p_character_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_realm text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT name, realm
    INTO v_name, v_realm
  FROM public.wow_characters
  WHERE id = p_character_id
    AND user_id = auth.uid()
  LIMIT 1;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;

  -- Single statement: guarantees exactly one main at all times (no intermediate "none")
  UPDATE public.wow_characters
  SET is_main = (id = p_character_id)
  WHERE user_id = auth.uid();

  -- Keep profile in sync for UI that relies on this display field
  UPDATE public.profiles
  SET main_character_name = v_name || '-' || v_realm,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_main_character(uuid) TO authenticated;

-- Prevent multiple mains per user at the database level
CREATE UNIQUE INDEX IF NOT EXISTS wow_characters_one_main_per_user
  ON public.wow_characters (user_id)
  WHERE (is_main);
