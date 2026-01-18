-- Remove the unique index that causes conflicts during atomic updates
DROP INDEX IF EXISTS wow_characters_one_main_per_user;

-- Recreate the function without relying on the index
-- Use a transaction-safe approach: unset first, then set
CREATE OR REPLACE FUNCTION public.set_main_character(p_character_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_realm text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the character belongs to the user
  SELECT name, realm
    INTO v_name, v_realm
  FROM public.wow_characters
  WHERE id = p_character_id
    AND user_id = v_user_id
  LIMIT 1;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;

  -- Unset all as main first
  UPDATE public.wow_characters
  SET is_main = false
  WHERE user_id = v_user_id AND is_main = true;

  -- Set the new main
  UPDATE public.wow_characters
  SET is_main = true
  WHERE id = p_character_id;

  -- Keep profile in sync
  UPDATE public.profiles
  SET main_character_name = v_name || '-' || v_realm,
      updated_at = now()
  WHERE id = v_user_id;
END;
$$;