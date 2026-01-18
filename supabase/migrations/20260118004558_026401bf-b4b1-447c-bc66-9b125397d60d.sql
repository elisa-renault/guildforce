-- New RPC to set main character by stable identity (name + realm_slug)
-- This avoids failures when background Battle.net sync deletes/reinserts rows (UUID ids change).

CREATE OR REPLACE FUNCTION public.set_main_character_by_key(
  p_name text,
  p_realm_slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_realm text;
  v_realm_slug text;
  v_updated_count int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find the character row for this user by stable identity
  SELECT name, realm, realm_slug
    INTO v_name, v_realm, v_realm_slug
  FROM public.wow_characters
  WHERE user_id = v_user_id
    AND lower(name) = lower(p_name)
    AND lower(realm_slug) = lower(p_realm_slug)
  LIMIT 1;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;

  -- Unset any previous main
  UPDATE public.wow_characters
  SET is_main = false
  WHERE user_id = v_user_id
    AND is_main = true;

  -- Set new main
  UPDATE public.wow_characters
  SET is_main = true
  WHERE user_id = v_user_id
    AND lower(name) = lower(p_name)
    AND lower(realm_slug) = lower(p_realm_slug);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  IF v_updated_count = 0 THEN
    -- Race window: character could have been deleted/reinserted between lookup and update
    RAISE EXCEPTION 'Character not found';
  END IF;

  -- Keep profile in sync
  UPDATE public.profiles
  SET main_character_name = v_name || '-' || v_realm,
      updated_at = now()
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_main_character_by_key(text, text) TO authenticated;
