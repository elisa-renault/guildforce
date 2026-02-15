-- Remove stale wishes/members without profile and allow wish managers to remove a member line safely.

-- Cleanup existing stale rows (e.g. account deletion processed outside auth cascade).
DELETE FROM public.class_wishes cw
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = cw.user_id
);

DELETE FROM public.guild_members gm
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = gm.user_id
);

CREATE OR REPLACE FUNCTION public.remove_guild_member_with_wishes(
  p_guild_id UUID,
  p_member_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_target_role TEXT;
BEGIN
  v_actor := auth.uid();

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_guild_id IS NULL OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'Missing guild or member id';
  END IF;

  IF NOT (
    public.is_guild_gm(p_guild_id, v_actor)
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_wishes')
    OR public.has_guild_permission(p_guild_id, v_actor, 'manage_members')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT role
    INTO v_target_role
  FROM public.guild_members
  WHERE guild_id = p_guild_id
    AND user_id = p_member_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Only GMs can remove a GM line.
  IF v_target_role = 'gm' AND NOT public.is_guild_gm(p_guild_id, v_actor) THEN
    RAISE EXCEPTION 'Not authorized to remove guild master';
  END IF;

  DELETE FROM public.class_wishes
  WHERE guild_id = p_guild_id
    AND user_id = p_member_id;

  DELETE FROM public.guild_members
  WHERE guild_id = p_guild_id
    AND user_id = p_member_id;

  PERFORM public.log_guild_activity(
    p_guild_id,
    v_actor,
    'member_removed',
    jsonb_build_object('source', 'wishes_table'),
    p_member_id,
    NULL
  );
END;
$$;
